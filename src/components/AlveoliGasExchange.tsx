import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CircleDot,
  Eye,
  Gauge,
  HelpCircle,
  Layers,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import type { RespirationDataset } from '../types/respiration';

export interface AlveoliGasExchangeProps {
  dataset: RespirationDataset;
  blindMode: boolean;
  revealedLabels: Record<string, boolean>;
  onRevealLabel: (key: string) => void;
}

const BASE_RADIUS_CM = 3;
const PRESET_SPHERE_COUNTS = [1, 8, 27, 64, 125, 1000] as const;

interface SphereClusterNode {
  key: string;
  cx: number;
  cy: number;
  r: number;
  shade: number;
}

/**
 * Generates back-to-front sorted 2D projections of a k x k x k sphere cluster
 * whose individual radius scales as R / k while preserving total volume.
 */
function buildSphereClusterNodes(
  divisionsPerAxis: number,
  centerX: number,
  centerY: number,
  baseRadiusPx: number
): SphereClusterNode[] {
  if (divisionsPerAxis <= 1) {
    return [
      {
        key: '0-0-0',
        cx: centerX,
        cy: centerY,
        r: baseRadiusPx,
        shade: 1,
      },
    ];
  }

  const k = divisionsPerAxis;
  const rPx = baseRadiusPx / k;
  const spacing = rPx * 2;
  // Compact isometric depth offset so the 3D volume remains visually clear inside the stage.
  const depthStepX = rPx * 0.42;
  const depthStepY = -rPx * 0.36;
  const halfSpan = ((k - 1) * spacing) / 2;
  const depthCenterOffsetX = ((k - 1) * depthStepX) / 2;
  const depthCenterOffsetY = ((k - 1) * depthStepY) / 2;

  const nodes: Array<SphereClusterNode & { sortOrder: number }> = [];

  for (let iz = k - 1; iz >= 0; iz--) {
    for (let iy = k - 1; iy >= 0; iy--) {
      for (let ix = 0; ix < k; ix++) {
        // For k=10 (1,000 spheres), keep the visible outer 2 shells so SVG remains 60fps.
        if (k >= 10 && ix < k - 2 && iy > 1 && iz > 1) {
          continue;
        }
        const localX = ix * spacing - halfSpan;
        const localY = iy * spacing - halfSpan;
        const cx = centerX + localX + iz * depthStepX - depthCenterOffsetX;
        const cy = centerY + localY + iz * depthStepY - depthCenterOffsetY;
        const depthFactor = 1 - (iz / Math.max(1, k - 1)) * 0.28;

        nodes.push({
          key: `${ix}-${iy}-${iz}`,
          cx,
          cy,
          r: Math.max(1.8, rPx * 0.96),
          shade: depthFactor,
          sortOrder: (k - iz) * 10000 + (k - iy) * 100 + ix,
        });
      }
    }
  }

  nodes.sort((a, b) => a.sortOrder - b.sortOrder);
  return nodes;
}

/**
 * Linearly interpolates between two #RRGGBB hex colors.
 */
function lerpHexColor(hexStart: string, hexEnd: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const s = parseInt(hexStart.slice(1), 16);
  const e = parseInt(hexEnd.slice(1), 16);

  const sr = (s >> 16) & 255;
  const sg = (s >> 8) & 255;
  const sb = s & 255;

  const er = (e >> 16) & 255;
  const eg = (e >> 8) & 255;
  const eb = e & 255;

  const r = Math.round(sr + (er - sr) * clamped);
  const g = Math.round(sg + (eg - sg) * clamped);
  const b = Math.round(sb + (eb - sb) * clamped);

  return `rgb(${r}, ${g}, ${b})`;
}

interface BlindMaskProps {
  blindMode: boolean;
  revealedLabels: Record<string, boolean>;
  revealKey: string;
  onRevealLabel: (key: string) => void;
  promptText: string;
  children: React.ReactNode;
}

function BlindMask({
  blindMode,
  revealedLabels,
  revealKey,
  onRevealLabel,
  promptText,
  children,
}: BlindMaskProps) {
  if (!blindMode) {
    return <>{children}</>;
  }

  const isRevealed = Boolean(revealedLabels[revealKey]);
  if (!isRevealed) {
    return (
      <button
        type="button"
        className="blind-pill is-hidden"
        onClick={() => onRevealLabel(revealKey)}
        title="클릭하여 가려진 내용 확인"
        aria-label={`${promptText} 정답 보기`}
      >
        <HelpCircle size={13} />
        <span>? {promptText}</span>
      </button>
    );
  }

  return <span className="blind-pill is-revealed">{children}</span>;
}

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'o2' | 'co2';
  radius: number;
  phase: number;
}

interface DiffusingMolecule {
  id: number;
  type: 'o2' | 'co2';
  xNorm: number;
  progress: number;
  speed: number;
  wobbleAmp: number;
  wobbleFreq: number;
  phase: number;
}

interface RedBloodCell {
  id: number;
  xNorm: number;
  laneOffset: number;
  speed: number;
  tilt: number;
  tiltSpeed: number;
  boundO2Count: number;
}

interface SimulationState {
  ambient: AmbientParticle[];
  diffusing: DiffusingMolecule[];
  rbcs: RedBloodCell[];
  flowChevronOffset: number;
}

function createInitialSimulationState(): SimulationState {
  const ambient: AmbientParticle[] = [];
  for (let i = 0; i < 24; i++) {
    ambient.push({
      x: (i * 0.043 + 0.05) % 0.94 + 0.03,
      y: ((i * 0.17) % 0.72) + 0.14,
      vx: ((i % 2 === 0 ? 1 : -1) * (0.04 + (i % 5) * 0.012)),
      vy: ((i % 3 === 0 ? 1 : -1) * (0.03 + (i % 4) * 0.01)),
      type: i < 18 ? 'o2' : 'co2',
      radius: i < 18 ? 4.4 : 5.2,
      phase: i * 0.9,
    });
  }

  const diffusing: DiffusingMolecule[] = [];
  for (let i = 0; i < 15; i++) {
    diffusing.push({
      id: i,
      type: 'o2',
      xNorm: 0.14 + ((i * 0.053) % 0.74),
      progress: i / 15,
      speed: 0.24 + (i % 4) * 0.035,
      wobbleAmp: 6 + (i % 3) * 3,
      wobbleFreq: 3.5 + (i % 3),
      phase: i * 1.1,
    });
  }
  for (let i = 0; i < 11; i++) {
    diffusing.push({
      id: 100 + i,
      type: 'co2',
      xNorm: 0.12 + ((i * 0.068) % 0.72),
      progress: i / 11,
      speed: 0.21 + (i % 3) * 0.03,
      wobbleAmp: 5 + (i % 3) * 2.5,
      wobbleFreq: 3.0 + (i % 4) * 0.7,
      phase: i * 1.4,
    });
  }

  const rbcs: RedBloodCell[] = [];
  const totalRbcs = 10;
  for (let i = 0; i < totalRbcs; i++) {
    rbcs.push({
      id: i,
      xNorm: i / totalRbcs,
      laneOffset: i % 2 === 0 ? -0.17 : 0.17,
      speed: 0.085,
      tilt: (i * 0.4) % (Math.PI * 2),
      tiltSpeed: (i % 2 === 0 ? 1 : -1) * 0.7,
      boundO2Count: 0,
    });
  }

  return {
    ambient,
    diffusing,
    rbcs,
    flowChevronOffset: 0,
  };
}

/**
 * Tab 4 Component: Alveoli Surface Area Comparison Lab (Left) &
 * Partial Pressure Diffusion Simulation (Right) for Korean Grade 8 Science [9과11-03].
 */
export function AlveoliGasExchange({
  dataset,
  blindMode,
  revealedLabels,
  onRevealLabel,
}: AlveoliGasExchangeProps) {
  // Left panel state: sphere count preset index (0..5 -> 1, 8, 27, 64, 125, 1000)
  const [presetIndex, setPresetIndex] = useState<number>(2);

  // Right panel state: playback and slow-motion speed
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 0.5>(1);

  const sphereCount = PRESET_SPHERE_COUNTS[presetIndex];
  const divisionsPerAxis = Math.round(Math.cbrt(sphereCount));
  const smallRadiusCm = BASE_RADIUS_CM / divisionsPerAxis;
  const totalVolumeCm3 = (4 / 3) * Math.PI * Math.pow(BASE_RADIUS_CM, 3);
  const baseSurfaceAreaCm2 = 4 * Math.PI * Math.pow(BASE_RADIUS_CM, 2);
  const totalSurfaceAreaCm2 =
    sphereCount * 4 * Math.PI * Math.pow(smallRadiusCm, 2);
  const areaMultiplier = divisionsPerAxis;

  const clusterNodes = useMemo(
    () => buildSphereClusterNodes(divisionsPerAxis, 386, 102, 58),
    [divisionsPerAxis]
  );

  // Canvas & simulation refs so toggling play/speed/blind mode preserves live particle state
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<SimulationState>(createInitialSimulationState());
  const isPlayingRef = useRef<boolean>(isPlaying);
  const speedRef = useRef<number>(speedMultiplier);
  const blindModeRef = useRef<boolean>(blindMode);
  const revealedRef = useRef<Record<string, boolean>>(revealedLabels);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    blindModeRef.current = blindMode;
  }, [blindMode]);

  useEffect(() => {
    revealedRef.current = revealedLabels;
  }, [revealedLabels]);

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) {
      return;
    }

    let logicalWidth = Math.max(320, wrapper.clientWidth);
    let logicalHeight = Math.max(190, wrapper.clientHeight);

    const resizeCanvas = () => {
      const rect = wrapper.getBoundingClientRect();
      logicalWidth = Math.max(320, Math.floor(rect.width));
      logicalHeight = Math.max(190, Math.floor(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(logicalWidth * dpr);
      canvas.height = Math.floor(logicalHeight * dpr);
      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(wrapper);

    let animationFrameId = 0;
    let lastTimeMs = performance.now();

    const drawO2Molecule = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      alpha = 1
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const offset = radius * 0.56;
      // Diatomic cyan O2 pair
      for (const dx of [-offset, offset]) {
        ctx.beginPath();
        ctx.arc(x + dx, y, radius * 0.78, 0, Math.PI * 2);
        ctx.fillStyle = '#00B4D8';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#0369A1';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + dx - radius * 0.2, y - radius * 0.2, radius * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();
      }
      ctx.restore();
    };

    const drawCO2Molecule = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      alpha = 1
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const offset = radius * 0.85;
      // Linear triatomic orange-amber CO2
      ctx.beginPath();
      ctx.arc(x - offset, y, radius * 0.62, 0, Math.PI * 2);
      ctx.arc(x + offset, y, radius * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = '#F4A261';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius * 0.74, 0, Math.PI * 2);
      ctx.fillStyle = '#EA580C';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#9A3412';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x - radius * 0.18, y - radius * 0.2, radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
      ctx.restore();
    };

    const drawCellWallRow = (
      ctx: CanvasRenderingContext2D,
      yTop: number,
      height: number,
      width: number,
      fillColor: string,
      strokeColor: string,
      nucleusColor: string
    ) => {
      const cellCount = 8;
      const gap = 3;
      const cellWidth = (width - gap * (cellCount + 1)) / cellCount;

      for (let i = 0; i < cellCount; i++) {
        const cx = gap + i * (cellWidth + gap);
        ctx.beginPath();
        ctx.roundRect(cx, yTop, cellWidth, height, height / 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        // Flattened squamous nucleus
        ctx.beginPath();
        ctx.ellipse(
          cx + cellWidth / 2,
          yTop + height / 2,
          Math.min(10, cellWidth * 0.18),
          Math.max(2.2, height * 0.24),
          0,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = nucleusColor;
        ctx.fill();
      }
    };

    const drawRedBloodCell = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      oxygenation: number,
      tilt: number,
      boundO2: number
    ) => {
      const rx = 18;
      const ry = 11.5;
      const fill = lerpHexColor('#7F1D1D', '#EF4444', oxygenation);
      const rim = lerpHexColor('#450A0A', '#B91C1C', oxygenation);
      const dimple = lerpHexColor('#5B1111', '#FCA5A5', oxygenation);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(tilt) * 0.18);

      // Outer biconcave disc
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = rim;
      ctx.stroke();

      // Inner dimple shading
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.56, ry * 0.48, 0, 0, Math.PI * 2);
      ctx.fillStyle = dimple;
      ctx.globalAlpha = 0.45;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Bound O2 molecules carried inside arterial RBCs
      const dotCount = Math.min(4, Math.floor(oxygenation * 4.4) + (boundO2 > 0 ? 1 : 0));
      const offsets: Array<[number, number]> = [
        [-6, -3],
        [5, -3],
        [-4, 4],
        [6, 3],
      ];
      for (let i = 0; i < dotCount && i < offsets.length; i++) {
        const [dx, dy] = offsets[i];
        ctx.beginPath();
        ctx.arc(dx, dy, 2.7, 0, Math.PI * 2);
        ctx.fillStyle = '#00B4D8';
        ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = '#E0F7FA';
        ctx.stroke();
      }

      ctx.restore();
    };

    const renderFrame = (nowMs: number) => {
      const rawDt = Math.min(0.05, Math.max(0.001, (nowMs - lastTimeMs) / 1000));
      lastTimeMs = nowMs;
      const dt = isPlayingRef.current ? rawDt * speedRef.current : 0;

      const sim = simRef.current;
      const w = logicalWidth;
      const h = logicalHeight;

      // Compartment geometry
      const alveolusTop = 0;
      const alveolusBottom = h * 0.37;
      const membraneTop = alveolusBottom;
      const cellHeight = Math.max(10, h * 0.052);
      const cellGap = Math.max(4, h * 0.02);
      const capillaryWallTop = membraneTop + cellHeight + cellGap;
      const capillaryTop = capillaryWallTop + cellHeight;
      const capillaryBottom = h - 4;
      const capillaryMidY = (capillaryTop + capillaryBottom) / 2;
      const capillarySpan = capillaryBottom - capillaryTop;

      // Advance simulation state
      if (dt > 0) {
        sim.flowChevronOffset = (sim.flowChevronOffset + dt * 36) % 48;

        for (const p of sim.ambient) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < 0.04 || p.x > 0.96) p.vx *= -1;
          if (p.y < 0.14 || p.y > 0.88) p.vy *= -1;
          p.x = Math.max(0.04, Math.min(0.96, p.x));
          p.y = Math.max(0.14, Math.min(0.88, p.y));
        }

        for (const rbc of sim.rbcs) {
          rbc.xNorm += rbc.speed * dt;
          rbc.tilt += rbc.tiltSpeed * dt;
          if (rbc.xNorm > 1.07) {
            rbc.xNorm = -0.07;
            rbc.boundO2Count = 0;
          }
        }

        for (const m of sim.diffusing) {
          m.progress += m.speed * dt;
          if (m.progress >= 1) {
            m.progress = 0;
            m.xNorm = 0.14 + ((m.xNorm + 0.23) % 0.72);
          }
          if (m.type === 'o2' && m.progress > 0.72) {
            for (const rbc of sim.rbcs) {
              if (Math.abs(rbc.xNorm - m.xNorm) < 0.07) {
                rbc.boundO2Count = Math.min(4, rbc.boundO2Count + 1);
              }
            }
          }
        }
      }

      // Draw frame
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(renderFrame);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // 1. Upper Alveolar Air Space
      const alvGrad = ctx.createLinearGradient(0, alveolusTop, 0, alveolusBottom);
      alvGrad.addColorStop(0, '#E0F7FA');
      alvGrad.addColorStop(1, '#F8FAFC');
      ctx.fillStyle = alvGrad;
      ctx.fillRect(0, alveolusTop, w, alveolusBottom);

      // Alveolar compartment badge in top-left
      ctx.fillStyle = '#0F172A';
      ctx.font = '700 12px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.fillText('폐포 내부 공기 (Alveolar Space)', 12, 18);

      // Ambient O2 and CO2 molecules inside alveolus
      for (const p of sim.ambient) {
        const px = p.x * w;
        const py = alveolusTop + p.y * (alveolusBottom - alveolusTop);
        if (p.type === 'o2') {
          drawO2Molecule(ctx, px, py, p.radius, 0.9);
        } else {
          drawCO2Molecule(ctx, px, py, p.radius, 0.72);
        }
      }

      // 2. Single-cell-thick alveolar epithelium + capillary endothelium barrier
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(0, membraneTop, w, capillaryTop - membraneTop);

      drawCellWallRow(
        ctx,
        membraneTop + 1,
        cellHeight - 2,
        w,
        '#FFE4E6',
        '#FB7185',
        '#E11D48'
      );
      drawCellWallRow(
        ctx,
        capillaryWallTop + 1,
        cellHeight - 2,
        w,
        '#FEE2E2',
        '#F87171',
        '#DC2626'
      );

      // Thin barrier label pill on right edge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.roundRect(w - 178, membraneTop + 2, 170, capillaryTop - membraneTop - 4, 6);
      ctx.fill();
      ctx.strokeStyle = '#FDA4AF';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#9F1239';
      ctx.font = '700 10.5px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.fillText(
        '한 층의 얇은 폐포벽 · 모세혈관벽',
        w - 171,
        membraneTop + (capillaryTop - membraneTop) / 2 + 4
      );

      // 3. Lower Capillary Vessel (Venous dark red left -> Arterial bright red right)
      const bloodGrad = ctx.createLinearGradient(0, 0, w, 0);
      bloodGrad.addColorStop(0, 'rgba(127, 29, 29, 0.22)');
      bloodGrad.addColorStop(0.5, 'rgba(185, 28, 28, 0.16)');
      bloodGrad.addColorStop(1, 'rgba(239, 68, 68, 0.14)');
      ctx.fillStyle = bloodGrad;
      ctx.fillRect(0, capillaryTop, w, capillaryBottom - capillaryTop);

      // Vessel bottom endothelial border
      ctx.fillStyle = '#FCA5A5';
      ctx.fillRect(0, capillaryBottom - 4, w, 4);

      // Subtle blood-flow chevrons left -> right
      ctx.save();
      ctx.strokeStyle = 'rgba(153, 27, 27, 0.22)';
      ctx.lineWidth = 2;
      for (let cx = -48 + sim.flowChevronOffset; cx < w + 24; cx += 48) {
        ctx.beginPath();
        ctx.moveTo(cx, capillaryMidY - 7);
        ctx.lineTo(cx + 8, capillaryMidY);
        ctx.lineTo(cx, capillaryMidY + 7);
        ctx.stroke();
      }
      ctx.restore();

      // Red Blood Cells transitioning from #7F1D1D (left) -> #EF4444 (right)
      for (const rbc of sim.rbcs) {
        const x = rbc.xNorm * w;
        const y = capillaryMidY + rbc.laneOffset * capillarySpan;
        const oxygenSaturation = Math.max(0, Math.min(1, (rbc.xNorm - 0.14) / 0.72));
        drawRedBloodCell(ctx, x, y, oxygenSaturation, rbc.tilt, rbc.boundO2Count);
      }

      // 4. Diffusing O2 (downward) and CO2 (upward) across the thin membrane
      const o2StartY = alveolusBottom - 22;
      const o2EndY = capillaryMidY + 6;
      const co2StartY = capillaryMidY + 4;
      const co2EndY = alveolusTop + 26;

      for (const m of sim.diffusing) {
        const wobbleX =
          Math.sin(m.progress * Math.PI * m.wobbleFreq + m.phase) * m.wobbleAmp;
        const x = m.xNorm * w + wobbleX;
        const fade =
          m.progress < 0.12
            ? m.progress / 0.12
            : m.progress > 0.88
              ? (1 - m.progress) / 0.12
              : 1;

        if (m.type === 'o2') {
          const y = o2StartY + (o2EndY - o2StartY) * m.progress;
          drawO2Molecule(ctx, x, y, 4.8, fade);
        } else {
          const y = co2StartY + (co2EndY - co2StartY) * m.progress;
          drawCO2Molecule(ctx, x, y, 5.2, fade);
        }
      }

      // 5. Optional Diffusion Direction Arrows on Canvas (masked in blindMode until revealed)
      const isO2ArrowVisible =
        !blindModeRef.current || Boolean(revealedRef.current['gas_o2_dir']);
      const isCO2ArrowVisible =
        !blindModeRef.current || Boolean(revealedRef.current['gas_co2_dir']);

      const arrowMidY = (membraneTop + capillaryTop) / 2;

      // O2 direction indicator (left-center)
      const o2ArrowX = w * 0.27;
      ctx.save();
      if (isO2ArrowVisible) {
        ctx.fillStyle = 'rgba(0, 180, 216, 0.16)';
        ctx.strokeStyle = '#0077B6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o2ArrowX - 10, arrowMidY - 26);
        ctx.lineTo(o2ArrowX + 10, arrowMidY - 26);
        ctx.lineTo(o2ArrowX + 10, arrowMidY + 8);
        ctx.lineTo(o2ArrowX + 17, arrowMidY + 8);
        ctx.lineTo(o2ArrowX, arrowMidY + 28);
        ctx.lineTo(o2ArrowX - 17, arrowMidY + 8);
        ctx.lineTo(o2ArrowX - 10, arrowMidY + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0369A1';
        ctx.font = '800 11px "Pretendard", "Malgun Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('O₂', o2ArrowX, arrowMidY + 3);
      } else {
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.roundRect(o2ArrowX - 24, arrowMidY - 14, 48, 28, 14);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#FDE047';
        ctx.font = '800 12px "Pretendard", "Malgun Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('O₂ ?', o2ArrowX, arrowMidY + 4);
      }
      ctx.restore();

      // CO2 direction indicator (right-center)
      const co2ArrowX = w * 0.57;
      ctx.save();
      if (isCO2ArrowVisible) {
        ctx.fillStyle = 'rgba(244, 162, 97, 0.22)';
        ctx.strokeStyle = '#C2591B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(co2ArrowX, arrowMidY - 28);
        ctx.lineTo(co2ArrowX + 17, arrowMidY - 8);
        ctx.lineTo(co2ArrowX + 10, arrowMidY - 8);
        ctx.lineTo(co2ArrowX + 10, arrowMidY + 26);
        ctx.lineTo(co2ArrowX - 10, arrowMidY + 26);
        ctx.lineTo(co2ArrowX - 10, arrowMidY - 8);
        ctx.lineTo(co2ArrowX - 17, arrowMidY - 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#9A3412';
        ctx.font = '800 11px "Pretendard", "Malgun Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CO₂', co2ArrowX, arrowMidY + 12);
      } else {
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.roundRect(co2ArrowX - 26, arrowMidY - 14, 52, 28, 14);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#FDE047';
        ctx.font = '800 12px "Pretendard", "Malgun Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CO₂ ?', co2ArrowX, arrowMidY + 4);
      }
      ctx.restore();

      // Vessel endpoint tags on canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.roundRect(8, capillaryTop + 6, 128, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#7F1D1D';
      ctx.font = '700 11px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.fillText('← 폐동맥 쪽 (정맥혈)', 14, capillaryTop + 21);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.roundRect(w - 136, capillaryTop + 6, 128, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#DC2626';
      ctx.font = '700 11px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.fillText('폐정맥 쪽 (동맥혈) →', w - 130, capillaryTop + 21);

      ctx.restore();
      animationFrameId = requestAnimationFrame(renderFrame);
    };

    animationFrameId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  const { alveolus, venousBlood, arterialBlood, diffusionPrinciple, surfaceAreaPrinciple } =
    dataset.gasExchangeFacts;

  return (
    <div className="lab-grid-equal" style={{ minHeight: 0 }}>
      {/* =====================================================================
          LEFT PANEL: 폐포 표면적 비교 실험기 (Surface Area Comparison Lab)
         ===================================================================== */}
      <section className="lab-card" aria-label="폐포 표면적 비교 실험기">
        <header className="lab-card-header">
          <h2 className="lab-card-title">
            <Layers size={18} color="#0077b6" />
            <span>폐포 표면적 비교 실험기</span>
          </h2>
          <span className="badge badge-inhale">총 부피 100% 동일 유지</span>
        </header>

        <div
          className="lab-card-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {/* SVG Side-by-Side Comparison Stage */}
          <div className="svg-stage" style={{ flex: '1 1 0', minHeight: '175px' }}>
            <svg
              viewBox="0 0 520 206"
              role="img"
              aria-label={`반지름 3cm 큰 구 1개와 반지름 ${smallRadiusCm.toFixed(2)}cm 작은 구 ${sphereCount}개의 부피 및 겉넓이 비교`}
            >
              <defs>
                <radialGradient id="bigSphereGrad" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#e0f7fa" />
                  <stop offset="45%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0369a1" />
                </radialGradient>
                <radialGradient id="smallSphereGrad" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffedd5" />
                  <stop offset="45%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#c2410c" />
                </radialGradient>
              </defs>

              {/* Left label */}
              <text
                x="125"
                y="20"
                textAnchor="middle"
                fontSize="12.5"
                fontWeight="700"
                fill="#0f172a"
              >
                분할 전: 큰 주머니 1개
              </text>

              {/* Single large sphere (N=1, R=3cm) */}
              <circle
                cx="125"
                cy="102"
                r="58"
                fill="url(#bigSphereGrad)"
                stroke="#0284c7"
                strokeWidth="1.5"
              />
              <ellipse
                cx="125"
                cy="102"
                rx="58"
                ry="16"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeDasharray="4 3"
                strokeWidth="1.2"
              />
              {/* Radius indicator line */}
              <line
                x1="125"
                y1="102"
                x2="183"
                y2="102"
                stroke="#0f172a"
                strokeWidth="1.8"
              />
              <circle cx="125" cy="102" r="3" fill="#0f172a" />
              <rect
                x="130"
                y="84"
                width="52"
                height="16"
                rx="4"
                fill="rgba(255,255,255,0.9)"
              />
              <text
                x="156"
                y="95"
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="700"
                fill="#0f172a"
              >
                R = 3.0cm
              </text>

              <text
                x="125"
                y="182"
                textAnchor="middle"
                fontSize="11.5"
                fontWeight="700"
                fill="#0369a1"
              >
                부피 {totalVolumeCm3.toFixed(1)} cm³ · 겉넓이 {baseSurfaceAreaCm2.toFixed(1)} cm²
              </text>

              {/* Center Comparison Arrow */}
              <g transform="translate(252, 98)">
                <rect
                  x="-36"
                  y="-22"
                  width="72"
                  height="44"
                  rx="10"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#059669"
                >
                  부피 100%
                </text>
                <text
                  x="0"
                  y="12"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#c2591b"
                >
                  겉넓이 {areaMultiplier}×
                </text>
              </g>

              {/* Right label */}
              <text
                x="386"
                y="20"
                textAnchor="middle"
                fontSize="12.5"
                fontWeight="700"
                fill="#0f172a"
              >
                분할 후: 작은 폐포 {sphereCount.toLocaleString()}개 ({divisionsPerAxis}×{divisionsPerAxis}×{divisionsPerAxis})
              </text>

              {/* Faint reference circle showing original radius R=3cm */}
              <circle
                cx="386"
                cy="102"
                r="58"
                fill="none"
                stroke="#cbd5e1"
                strokeDasharray="4 4"
                strokeWidth="1.3"
              />

              {/* Cluster of N small spheres */}
              <g>
                {clusterNodes.map((node) => (
                  <circle
                    key={node.key}
                    cx={node.cx}
                    cy={node.cy}
                    r={node.r}
                    fill={
                      divisionsPerAxis === 1
                        ? 'url(#bigSphereGrad)'
                        : 'url(#smallSphereGrad)'
                    }
                    fillOpacity={0.75 + node.shade * 0.25}
                    stroke={divisionsPerAxis === 1 ? '#0284c7' : '#9a3412'}
                    strokeWidth={divisionsPerAxis >= 10 ? 0.45 : 0.9}
                  />
                ))}
              </g>

              <text
                x="386"
                y="182"
                textAnchor="middle"
                fontSize="11.5"
                fontWeight="700"
                fill="#c2591b"
              >
                r = {smallRadiusCm.toFixed(2)} cm · 총 겉넓이 {totalSurfaceAreaCm2.toFixed(1)} cm²
              </text>
            </svg>
          </div>

          {/* Preset Buttons + Synchronized Slider */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface-muted)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)' }}>
                분할 개수 (N) 선택
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {PRESET_SPHERE_COUNTS.map((count, index) => {
                  const isActive = index === presetIndex;
                  return (
                    <button
                      key={count}
                      type="button"
                      className={`btn ${isActive ? 'btn-primary' : ''}`}
                      style={{ padding: '4px 9px', fontSize: '0.78rem' }}
                      onClick={() => setPresetIndex(index)}
                    >
                      {count.toLocaleString()}개
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                1개
              </span>
              <input
                type="range"
                min={0}
                max={PRESET_SPHERE_COUNTS.length - 1}
                step={1}
                value={presetIndex}
                onChange={(e) => setPresetIndex(Number(e.target.value))}
                className="lab-slider"
                aria-label="분할된 구 개수 슬라이더"
              />
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-exhale-dark)' }}>
                1,000개 (10배)
              </span>
            </div>
          </div>

          {/* Live Numerical Readout Metrics */}
          <div className="metric-row">
            <div className="metric-box">
              <div className="metric-label">총 부피: 동일 (100%)</div>
              <div className="metric-value" style={{ color: 'var(--color-success)' }}>
                {totalVolumeCm3.toFixed(1)} cm³
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                나누어도 전체 부피 불변
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">작은 구 반지름 (r = R / N¹/³)</div>
              <div className="metric-value">
                {smallRadiusCm.toFixed(2)} cm
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                기준 R = 3.00 cm의 1/{divisionsPerAxis}
              </div>
            </div>

            <div
              className="metric-box"
              style={{
                backgroundColor:
                  areaMultiplier > 1 ? 'var(--color-exhale-soft)' : 'var(--color-surface-muted)',
                borderColor:
                  areaMultiplier > 1 ? 'var(--color-exhale-border)' : 'var(--color-border-light)',
              }}
            >
              <div className="metric-label" style={{ color: 'var(--color-exhale-dark)' }}>
                총 겉넓이: {areaMultiplier}배 증가!
              </div>
              <div className="metric-value" style={{ color: 'var(--color-exhale-dark)' }}>
                {totalSurfaceAreaCm2.toFixed(1)} cm²
              </div>
              <div
                style={{
                  marginTop: '4px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(194, 89, 27, 0.16)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(areaMultiplier / 10) * 100}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-exhale-dark)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Real Human Lungs Connection */}
          <div className="callout-tip" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <Sparkles size={15} color="#0077b6" />
              <span>실제 우리 몸의 폐 연결: 약 3억 개의 폐포 → 70~100 m² (테니스 코트 절반 크기!)</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.4 }}>
              {surfaceAreaPrinciple}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          RIGHT PANEL: 분압 차 기체 교환 미시 시뮬레이션 (Partial Pressure Diffusion)
         ===================================================================== */}
      <section className="lab-card" aria-label="분압 차 기체 교환 미시 시뮬레이션">
        <header className="lab-card-header">
          <h2 className="lab-card-title">
            <CircleDot size={18} color="#e76f51" />
            <span>분압 차 기체 교환 미시 시뮬레이션</span>
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className={`btn ${isPlaying ? '' : 'btn-primary'}`}
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => setIsPlaying((prev) => !prev)}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? '일시정지' : '재생'}</span>
            </button>

            <button
              type="button"
              className={`btn ${speedMultiplier === 0.5 ? 'btn-primary' : ''}`}
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => setSpeedMultiplier((prev) => (prev === 1 ? 0.5 : 1))}
              title="교사 설명용 느린 재생 전환"
            >
              <Gauge size={14} />
              <span>{speedMultiplier === 1 ? '1x 보통' : '0.5x 느리게'}</span>
            </button>
          </div>
        </header>

        <div
          className="lab-card-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}
        >
          {/* Top Alveolus Compartment Pressure Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '7px 10px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-inhale-soft)',
              border: '1px solid var(--color-inhale-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-inhale">{alveolus.nameKo}</span>
              <span style={{ fontSize: '0.77rem', color: '#0c4a6e' }}>
                들숨으로 들어온 신선한 공기
              </span>
            </div>

            <BlindMask
              blindMode={blindMode}
              revealedLabels={revealedLabels}
              revealKey="gas_alveolus_pressure"
              onRevealLabel={onRevealLabel}
              promptText="폐포 분압 확인"
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>
                O₂ {alveolus.o2LevelKo} ({alveolus.o2MmHg} mmHg) · CO₂ {alveolus.co2LevelKo} ({alveolus.co2MmHg} mmHg)
              </span>
            </BlindMask>
          </div>

          {/* 60fps Canvas Diffusion Animation */}
          <div
            ref={canvasWrapperRef}
            style={{
              position: 'relative',
              flex: '1 1 0',
              minHeight: '190px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
          >
            <canvas
              ref={canvasRef}
              aria-label="폐포와 모세혈관 사이 산소와 이산화탄소의 분압 차 확산 애니메이션"
              style={{ display: 'block', width: '100%', height: '100%' }}
            />
          </div>

          {/* Capillary Venous vs Arterial Blood Partial Pressure Readouts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            <div
              className="metric-box"
              style={{
                borderLeft: '4px solid #7f1d1d',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#7f1d1d' }}>
                  ● {venousBlood.nameKo}
                </span>
              </div>
              <div>
                <BlindMask
                  blindMode={blindMode}
                  revealedLabels={revealedLabels}
                  revealKey="gas_venous_pressure"
                  onRevealLabel={onRevealLabel}
                  promptText="정맥혈 분압"
                >
                  <span style={{ fontSize: '0.79rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    O₂ {venousBlood.o2LevelKo} ({venousBlood.o2MmHg} mmHg) / CO₂ {venousBlood.co2LevelKo} ({venousBlood.co2MmHg} mmHg)
                  </span>
                </BlindMask>
              </div>
            </div>

            <div
              className="metric-box"
              style={{
                borderLeft: '4px solid #ef4444',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#dc2626' }}>
                  ● {arterialBlood.nameKo}
                </span>
              </div>
              <div>
                <BlindMask
                  blindMode={blindMode}
                  revealedLabels={revealedLabels}
                  revealKey="gas_arterial_pressure"
                  onRevealLabel={onRevealLabel}
                  promptText="동맥혈 분압"
                >
                  <span style={{ fontSize: '0.79rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    O₂ {arterialBlood.o2LevelKo} ({arterialBlood.o2MmHg} mmHg) / CO₂ {arterialBlood.co2LevelKo} ({arterialBlood.co2MmHg} mmHg)
                  </span>
                </BlindMask>
              </div>
            </div>
          </div>

          {/* Gas Transfer Direction Arrows (Interactive in Blind Mode) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            <div
              style={{
                padding: '7px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-inhale-soft)',
                border: '1px solid var(--color-inhale-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#0369a1',
                }}
              >
                {!blindMode || revealedLabels['gas_o2_dir'] ? (
                  <ArrowDown size={14} />
                ) : (
                  <HelpCircle size={14} />
                )}
                <span>산소 (O₂) 이동 방향</span>
              </div>
              <div>
                <BlindMask
                  blindMode={blindMode}
                  revealedLabels={revealedLabels}
                  revealKey="gas_o2_dir"
                  onRevealLabel={onRevealLabel}
                  promptText="O₂ 이동 방향"
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.77rem',
                      fontWeight: 700,
                      color: '#0c4a6e',
                    }}
                  >
                    <span>폐포 ({alveolus.o2MmHg})</span>
                    <ArrowRight size={12} />
                    <span>모세혈관 ({venousBlood.o2MmHg} mmHg)</span>
                  </span>
                </BlindMask>
              </div>
            </div>

            <div
              style={{
                padding: '7px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-exhale-soft)',
                border: '1px solid var(--color-exhale-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#c2591b',
                }}
              >
                {!blindMode || revealedLabels['gas_co2_dir'] ? (
                  <ArrowUp size={14} />
                ) : (
                  <HelpCircle size={14} />
                )}
                <span>이산화탄소 (CO₂) 이동 방향</span>
              </div>
              <div>
                <BlindMask
                  blindMode={blindMode}
                  revealedLabels={revealedLabels}
                  revealKey="gas_co2_dir"
                  onRevealLabel={onRevealLabel}
                  promptText="CO₂ 이동 방향"
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.77rem',
                      fontWeight: 700,
                      color: '#7c2d12',
                    }}
                  >
                    <span>모세혈관 ({venousBlood.co2MmHg})</span>
                    <ArrowRight size={12} />
                    <span>폐포 ({alveolus.co2MmHg} mmHg)</span>
                  </span>
                </BlindMask>
              </div>
            </div>
          </div>

          {/* Diffusion Principle Callout (or Blind Mode Instruction) */}
          <div className={blindMode ? 'callout-warning' : 'callout-tip'} style={{ fontSize: '0.79rem' }}>
            {blindMode ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <Eye size={14} />
                블라인드 모드: 학생들에게 각 구간의 분압과 기체 이동 방향을 질문한 뒤 ‘?’ 버튼을 눌러 확인하세요.
              </span>
            ) : (
              <span>
                <strong>확산 원리:</strong> {diffusionPrinciple}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
