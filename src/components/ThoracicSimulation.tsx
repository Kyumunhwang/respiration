import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Eye, Gauge, Pause, Play, Wind, AlertTriangle } from 'lucide-react';
import type { BottleHumanTargetId, RespirationDataset } from '../types/respiration';
import type { BreathingMode, ThoracicState } from '../engine/respirationPhysics';
import { ThoraxAnatomySvg } from './visuals/ThoraxAnatomySvg';

export interface ThoracicSimulationProps {
  phase: number;
  onPhaseChange: (p: number) => void;
  breathingMode: 'manual' | 'normal' | 'exercise';
  onBreathingModeChange: (m: 'manual' | 'normal' | 'exercise') => void;
  thoracicState: ThoracicState;
  blindMode: boolean;
  revealedLabels: Record<string, boolean>;
  onRevealLabel: (key: string) => void;
  activeCausalStep: number | null;
  dataset: RespirationDataset;
}

interface HistorySample {
  lungVolumeMl: number;
  alveolarPressureMmHg: number;
}

interface AirwayPoint {
  x: number;
  y: number;
}

interface AirParticle {
  branch: 'left' | 'right';
  progress: number; // 0 (nose) -> 1 (deep lung)
  speed: number;
  radius: number;
  alpha: number;
}

const HISTORY_LENGTH = 72;
const SAMPLE_INTERVAL_MS = 75;
const PARTICLE_COUNT = 28;

const STEP_TO_TARGET: Record<number, BottleHumanTargetId> = {
  1: 'diaphragm',
  2: 'thoracic_cavity',
  3: 'thoracic_cavity',
  4: 'lungs',
  5: 'lungs',
  6: 'trachea',
};

function createInitialHistory(initialState: ThoracicState): HistorySample[] {
  return Array.from({ length: HISTORY_LENGTH }, () => ({
    lungVolumeMl: initialState.lungVolumeMl,
    alveolarPressureMmHg: initialState.alveolarPressureMmHg,
  }));
}

function createInitialParticles(): AirParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, idx) => ({
    branch: idx % 2 === 0 ? 'left' : 'right',
    progress: (idx / PARTICLE_COUNT) % 1,
    speed: 0.35 + (idx % 5) * 0.04,
    radius: 3 + (idx % 3) * 0.7,
    alpha: 0.72 + (idx % 4) * 0.07,
  }));
}

function samplePolyline(points: AirwayPoint[], t: number): { x: number; y: number; angle: number } {
  const clamped = Math.max(0, Math.min(1, t));
  if (points.length < 2) {
    return { x: points[0]?.x ?? 0, y: points[0]?.y ?? 0, angle: Math.PI / 2 };
  }

  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) {
    return { x: points[0].x, y: points[0].y, angle: Math.PI / 2 };
  }

  let targetDist = clamped * totalLength;
  for (let i = 0; i < segLengths.length; i += 1) {
    const segLen = segLengths[i];
    if (targetDist <= segLen || i === segLengths.length - 1) {
      const localT = segLen > 0 ? targetDist / segLen : 0;
      const p0 = points[i];
      const p1 = points[i + 1];
      return {
        x: p0.x + (p1.x - p0.x) * localT,
        y: p0.y + (p1.y - p0.y) * localT,
        angle: Math.atan2(p1.y - p0.y, p1.x - p0.x),
      };
    }
    targetDist -= segLen;
  }

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return {
    x: last.x,
    y: last.y,
    angle: Math.atan2(last.y - prev.y, last.x - prev.x),
  };
}

/**
 * Interactive thoracic mechanics simulator combining the anatomical ThoraxAnatomySvg,
 * a pressure-gated airflow particle canvas, Boyle's law meters, and dual-curve chart.
 */
export const ThoracicSimulation: React.FC<ThoracicSimulationProps> = ({
  phase,
  onPhaseChange,
  breathingMode,
  onBreathingModeChange,
  thoracicState,
  blindMode,
  revealedLabels,
  onRevealLabel,
  activeCausalStep,
  dataset,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestStateRef = useRef<ThoracicState>(thoracicState);
  latestStateRef.current = thoracicState;

  const [history, setHistory] = useState<HistorySample[]>(() =>
    createInitialHistory(thoracicState)
  );

  // Sample rolling volume & pressure history for the live dual-curve SVG chart
  useEffect(() => {
    const timerId = window.setInterval(() => {
      const current = latestStateRef.current;
      setHistory((prev) => [
        ...prev.slice(1),
        {
          lungVolumeMl: current.lungVolumeMl,
          alveolarPressureMmHg: current.alveolarPressureMmHg,
        },
      ]);
    }, SAMPLE_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  // Airflow particle system layered over ThoraxAnatomySvg (zero-leak RAF + ResizeObserver)
  useEffect(() => {
    const stageEl = stageRef.current;
    const canvasEl = canvasRef.current;
    if (!stageEl || !canvasEl) {
      return undefined;
    }

    const ctx = canvasEl.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    const particles = createInitialParticles();
    let stageWidth = stageEl.clientWidth || 400;
    let stageHeight = stageEl.clientHeight || 400;
    let dpr = window.devicePixelRatio || 1;

    const syncCanvasSize = () => {
      stageWidth = Math.max(1, stageEl.clientWidth);
      stageHeight = Math.max(1, stageEl.clientHeight);
      dpr = window.devicePixelRatio || 1;
      canvasEl.width = Math.round(stageWidth * dpr);
      canvasEl.height = Math.round(stageHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    const resizeObserver = new ResizeObserver(syncCanvasSize);
    resizeObserver.observe(stageEl);

    const resolveAirwayPaths = (): { left: AirwayPoint[]; right: AirwayPoint[] } => {
      const stageRect = stageEl.getBoundingClientRect();
      const nasalEl = stageEl.querySelector('#layer-nasal');
      const tracheaEl = stageEl.querySelector('#layer-trachea');
      const bronchiEl = stageEl.querySelector('#layer-bronchi');
      const lungsEl = stageEl.querySelector('#layer-lungs');

      if (nasalEl && tracheaEl && bronchiEl && lungsEl && stageRect.width > 0 && stageRect.height > 0) {
        const rel = (el: Element) => {
          const r = el.getBoundingClientRect();
          return {
            cx: r.left - stageRect.left + r.width / 2,
            top: r.top - stageRect.top,
            bottom: r.bottom - stageRect.top,
            left: r.left - stageRect.left,
            right: r.right - stageRect.left,
            width: r.width,
            height: r.height,
          };
        };

        const nasal = rel(nasalEl);
        const trachea = rel(tracheaEl);
        const bronchi = rel(bronchiEl);
        const lungs = rel(lungsEl);

        const entryX = trachea.cx;
        const noseStart: AirwayPoint = {
          x: nasal.cx,
          y: Math.max(8, nasal.top + nasal.height * 0.35),
        };
        const pharynxPoint: AirwayPoint = {
          x: entryX,
          y: trachea.top + 4,
        };
        const carinaPoint: AirwayPoint = {
          x: bronchi.cx,
          y: Math.max(trachea.bottom - 2, bronchi.top + bronchi.height * 0.25),
        };

        const leftLungTarget: AirwayPoint = {
          x: lungs.left + lungs.width * 0.27,
          y: lungs.top + lungs.height * 0.56,
        };
        const rightLungTarget: AirwayPoint = {
          x: lungs.left + lungs.width * 0.73,
          y: lungs.top + lungs.height * 0.56,
        };

        return {
          left: [
            noseStart,
            pharynxPoint,
            carinaPoint,
            {
              x: (carinaPoint.x + leftLungTarget.x) * 0.5,
              y: (carinaPoint.y + leftLungTarget.y) * 0.48,
            },
            leftLungTarget,
          ],
          right: [
            noseStart,
            pharynxPoint,
            carinaPoint,
            {
              x: (carinaPoint.x + rightLungTarget.x) * 0.5,
              y: (carinaPoint.y + rightLungTarget.y) * 0.48,
            },
            rightLungTarget,
          ],
        };
      }

      // Fallback normalized airway spline if SVG layers are not mounted yet
      const cx = stageWidth * 0.5;
      return {
        left: [
          { x: cx, y: stageHeight * 0.09 },
          { x: cx, y: stageHeight * 0.22 },
          { x: cx, y: stageHeight * 0.39 },
          { x: stageWidth * 0.4, y: stageHeight * 0.47 },
          { x: stageWidth * 0.34, y: stageHeight * 0.58 },
        ],
        right: [
          { x: cx, y: stageHeight * 0.09 },
          { x: cx, y: stageHeight * 0.22 },
          { x: cx, y: stageHeight * 0.39 },
          { x: stageWidth * 0.6, y: stageHeight * 0.47 },
          { x: stageWidth * 0.66, y: stageHeight * 0.58 },
        ],
      };
    };

    let rafId = 0;
    let lastTimestamp = performance.now();

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTimestamp) / 1000));
      lastTimestamp = now;

      ctx.clearRect(0, 0, stageWidth, stageHeight);

      const current = latestStateRef.current;
      const isInhaleFlow = current.alveolarPressureMmHg < current.baselinePressureMmHg - 0.05;
      const isExhaleFlow = current.alveolarPressureMmHg > current.baselinePressureMmHg + 0.05;

      if (isInhaleFlow || isExhaleFlow) {
        const paths = resolveAirwayPaths();
        const speedMagnitude = Math.max(0.28, Math.abs(current.airflowVelocity) * 1.45);
        const flowSign = isInhaleFlow ? 1 : -1;
        const particleColor = isInhaleFlow ? '#00B4D8' : '#F4A261';
        const glowColor = isInhaleFlow ? 'rgba(0, 180, 216, 0.35)' : 'rgba(244, 162, 97, 0.38)';

        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          p.progress += flowSign * p.speed * speedMagnitude * dt;
          if (p.progress > 1) {
            p.progress -= 1;
          } else if (p.progress < 0) {
            p.progress += 1;
          }

          const path = p.branch === 'left' ? paths.left : paths.right;
          const pos = samplePolyline(path, p.progress);
          const motionAngle = isInhaleFlow ? pos.angle : pos.angle + Math.PI;

          // Fade smoothly at nasal inlet/outlet and deep alveolar endpoints
          const edgeFade = Math.sin(Math.PI * Math.max(0.04, Math.min(0.96, p.progress)));
          const alpha = Math.max(0.15, p.alpha * edgeFade);

          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(motionAngle);
          ctx.globalAlpha = alpha;

          // Soft halo
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 1.9, 0, Math.PI * 2);
          ctx.fillStyle = glowColor;
          ctx.fill();

          // Directional teardrop / chevron dot showing airflow direction
          ctx.beginPath();
          ctx.moveTo(p.radius * 1.6, 0);
          ctx.lineTo(-p.radius * 1.1, -p.radius * 0.95);
          ctx.lineTo(-p.radius * 0.55, 0);
          ctx.lineTo(-p.radius * 1.1, p.radius * 0.95);
          ctx.closePath();
          ctx.fillStyle = particleColor;
          ctx.fill();

          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [breathingMode]);

  const selectedTarget =
    activeCausalStep !== null ? (STEP_TO_TARGET[activeCausalStep] ?? null) : null;

  const isDirectionRevealed = !blindMode || Boolean(revealedLabels['mechanics_direction']);
  const isPressureCmpRevealed = !blindMode || Boolean(revealedLabels['mechanics_pressure_cmp']);
  const isAirflowDirRevealed = !blindMode || Boolean(revealedLabels['mechanics_airflow_dir']);

  const {
    direction,
    thoracicVolumeMl,
    lungVolumeMl,
    thoracicPressureMmHg,
    alveolarPressureMmHg,
    baselinePressureMmHg,
  } = thoracicState;

  const directionLabel =
    direction === 'inhale'
      ? '들숨 (외부 공기 유입)'
      : direction === 'exhale'
        ? '날숨 (폐 공기 유출)'
        : '정지 (압력 평형)';

  const directionBadgeClass =
    direction === 'inhale'
      ? 'badge-inhale'
      : direction === 'exhale'
        ? 'badge-exhale'
        : 'badge-neutral';

  const pressureCompareText =
    alveolarPressureMmHg < baselinePressureMmHg - 0.05
      ? `대기압(${baselinePressureMmHg})보다 낮음 ▼`
      : alveolarPressureMmHg > baselinePressureMmHg + 0.05
        ? `대기압(${baselinePressureMmHg})보다 높음 ▲`
        : `대기압(${baselinePressureMmHg})과 같음`;

  const airflowDirectionText =
    direction === 'inhale'
      ? '외부 → 코·기관 → 폐 (유입)'
      : direction === 'exhale'
        ? '폐 → 기관·코 → 외부 (유출)'
        : '공기 이동 없음 (0)';

  const volumeDeltaFromRest = thoracicVolumeMl - dataset.physicsParams.restThoracicVolumeMl;
  const lungDeltaFromRest = lungVolumeMl - dataset.physicsParams.restLungVolumeMl;

  // Dual-curve SVG coordinates
  const chartGeometry = useMemo(() => {
    const width = 380;
    const height = 116;
    const padLeft = 36;
    const padRight = 38;
    const padTop = 12;
    const padBottom = 18;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const minVol = 1950;
    const maxVol = 2850;
    const minPress = 753;
    const maxPress = 767;

    const toX = (idx: number) =>
      padLeft + (idx / Math.max(1, history.length - 1)) * plotW;
    const toVolY = (v: number) =>
      padTop + (1 - (Math.max(minVol, Math.min(maxVol, v)) - minVol) / (maxVol - minVol)) * plotH;
    const toPressY = (p: number) =>
      padTop + (1 - (Math.max(minPress, Math.min(maxPress, p)) - minPress) / (maxPress - minPress)) * plotH;

    const volPath = history
      .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(idx).toFixed(1)} ${toVolY(s.lungVolumeMl).toFixed(1)}`)
      .join(' ');
    const pressPath = history
      .map(
        (s, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${toX(idx).toFixed(1)} ${toPressY(s.alveolarPressureMmHg).toFixed(1)}`
      )
      .join(' ');

    const baselineY = toPressY(baselinePressureMmHg);
    const lastSample = history[history.length - 1];

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotW,
      plotH,
      volPath,
      pressPath,
      baselineY,
      lastX: toX(history.length - 1),
      lastVolY: toVolY(lastSample.lungVolumeMl),
      lastPressY: toPressY(lastSample.alveolarPressureMmHg),
    };
  }, [history, baselinePressureMmHg]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPhase = parseFloat(event.target.value);
    if (breathingMode !== 'manual') {
      onBreathingModeChange('manual');
    }
    onPhaseChange(nextPhase);
  };

  const handleModeClick = (mode: BreathingMode) => {
    onBreathingModeChange(mode);
  };

  const handlePresetPhase = (targetPhase: number) => {
    if (breathingMode !== 'manual') {
      onBreathingModeChange('manual');
    }
    onPhaseChange(targetPhase);
  };

  return (
    <div className="lab-grid-2col">
      {/* Left/Center Stage: Thorax Anatomy SVG + Airflow Particle Canvas */}
      <section className="lab-card">
        <div className="lab-card-header">
          <h2 className="lab-card-title">
            <Wind size={18} color="#0077b6" />
            인체 흉곽 · 호흡 운동 시뮬레이션
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeCausalStep !== null && (
              <span className="badge badge-up">수업 {activeCausalStep}/6단계</span>
            )}
            {isDirectionRevealed ? (
              <span className={`badge ${directionBadgeClass}`}>{directionLabel}</span>
            ) : (
              <button
                type="button"
                className="blind-pill is-hidden"
                onClick={() => onRevealLabel('mechanics_direction')}
                title="클릭하여 호흡 방향 확인"
              >
                <Eye size={13} />? (들숨/날숨)
              </button>
            )}
          </div>
        </div>

        <div className="lab-card-body no-scroll" style={{ gap: '8px' }}>
          <div className="svg-stage" ref={stageRef} style={{ flex: '1 1 0' }}>
            <ThoraxAnatomySvg
              phase={phase}
              selectedTarget={selectedTarget}
              blindMode={blindMode}
              revealedLabels={revealedLabels}
              onRevealLabel={onRevealLabel}
              showLabels={true}
            />
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            />

            {/* Top-left Airflow Legend Pill */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid var(--color-border-light)',
                boxShadow: 'var(--shadow-sm)',
                fontSize: '0.75rem',
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#00B4D8',
                    display: 'inline-block',
                  }}
                />
                <span>들숨 유입 (P &lt; 760)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#F4A261',
                    display: 'inline-block',
                  }}
                />
                <span>날숨 유출 (P &gt; 760)</span>
              </div>
            </div>

            {/* Bottom-right Live Pressure Gauge Chip */}
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(15, 23, 42, 0.88)',
                color: '#f8fafc',
                fontSize: '0.76rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                pointerEvents: 'none',
              }}
            >
              폐 내부 {alveolarPressureMmHg.toFixed(1)} vs 대기 {baselinePressureMmHg} mmHg
            </div>
          </div>

          <div
            className="callout-warning"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, color: '#d97706' }} />
            <span>
              <strong>핵심 주의: 폐는 근육이 없어 스스로 움직이지 못함!</strong> 갈비뼈·횡격막 움직임 →
              흉강 부피·압력 변화 → 폐가 수동적으로 변합니다.
            </span>
          </div>
        </div>
      </section>

      {/* Right Control & Telemetry Panel */}
      <section className="lab-card">
        <div className="lab-card-header">
          <h2 className="lab-card-title">
            <Gauge size={18} color="#0077b6" />
            호흡 제어 · 보일의 법칙 계측
          </h2>
          <span className="badge badge-neutral">
            {breathingMode === 'manual'
              ? '수동 슬라이더'
              : breathingMode === 'normal'
                ? `정상 호흡 (${dataset.physicsParams.normalBpm}회/분)`
                : `운동 후 (${dataset.physicsParams.exerciseBpm}회/분)`}
          </span>
        </div>

        <div
          className="lab-card-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {/* Mode Toggle Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
            <button
              type="button"
              className={`btn ${breathingMode === 'manual' ? 'btn-primary' : ''}`}
              onClick={() => handleModeClick('manual')}
              style={{ padding: '7px 6px', fontSize: '0.8rem' }}
            >
              <Pause size={14} />
              수동 슬라이더
            </button>
            <button
              type="button"
              className={`btn ${breathingMode === 'normal' ? 'btn-primary' : ''}`}
              onClick={() => handleModeClick('normal')}
              style={{ padding: '7px 6px', fontSize: '0.8rem' }}
            >
              <Play size={14} />
              정상 호흡 ({dataset.physicsParams.normalBpm}회/분)
            </button>
            <button
              type="button"
              className={`btn ${breathingMode === 'exercise' ? 'btn-primary' : ''}`}
              onClick={() => handleModeClick('exercise')}
              style={{ padding: '7px 6px', fontSize: '0.8rem' }}
            >
              <Activity size={14} />
              운동 후 ({dataset.physicsParams.exerciseBpm}회/분)
            </button>
          </div>

          {/* Continuous Phase Slider */}
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface-muted)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              <span style={{ color: 'var(--color-exhale-dark)' }}>날숨 최대 (-1)</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                평상시 (0) · 현재: {phase.toFixed(2)}
              </span>
              <span style={{ color: 'var(--color-inhale-dark)' }}>들숨 최대 (+1)</span>
            </div>

            <input
              type="range"
              className="lab-slider"
              min={-1}
              max={1}
              step={0.01}
              value={phase}
              onChange={handleSliderChange}
              aria-label="호흡 단계 슬라이더 (날숨 최대 -1 에서 들숨 최대 +1)"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginTop: '7px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => handlePresetPhase(-1)}
                style={{ flex: 1, padding: '4px 6px', fontSize: '0.76rem' }}
              >
                날숨 최대 멈춤
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handlePresetPhase(0)}
                style={{ flex: 1, padding: '4px 6px', fontSize: '0.76rem' }}
              >
                평상시 (0)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handlePresetPhase(1)}
                style={{ flex: 1, padding: '4px 6px', fontSize: '0.76rem' }}
              >
                들숨 최대 멈춤
              </button>
            </div>
          </div>

          {/* Real-Time Boyle's Law Numerical Meters */}
          <div className="metric-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="metric-box">
              <div className="metric-label">흉강 부피 (갈비뼈·횡격막)</div>
              <div className="metric-value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span>{thoracicVolumeMl.toLocaleString()} mL</span>
                <span
                  style={{
                    fontSize: '0.74rem',
                    color:
                      volumeDeltaFromRest > 0
                        ? 'var(--color-up)'
                        : volumeDeltaFromRest < 0
                          ? 'var(--color-down)'
                          : 'var(--color-text-muted)',
                  }}
                >
                  ({volumeDeltaFromRest > 0 ? `+${volumeDeltaFromRest}` : volumeDeltaFromRest})
                </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">폐 부피 (수동적 변화)</div>
              <div className="metric-value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span>{lungVolumeMl.toLocaleString()} mL</span>
                <span
                  style={{
                    fontSize: '0.74rem',
                    color:
                      lungDeltaFromRest > 0
                        ? 'var(--color-up)'
                        : lungDeltaFromRest < 0
                          ? 'var(--color-down)'
                          : 'var(--color-text-muted)',
                  }}
                >
                  ({lungDeltaFromRest > 0 ? `+${lungDeltaFromRest}` : lungDeltaFromRest})
                </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">흉강 압력 (보일의 법칙)</div>
              <div className="metric-value">
                {thoracicPressureMmHg.toFixed(1)}{' '}
                <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>mmHg</span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">폐 내부 압력 (vs 대기압 760)</div>
              <div className="metric-value">
                {alveolarPressureMmHg.toFixed(1)}{' '}
                <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>mmHg</span>
              </div>
            </div>
          </div>

          {/* Blind-Mode Aware Pressure Comparison & Airflow Readouts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--color-border-light)',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                폐 내부 압력 vs 대기압
              </span>
              {isPressureCmpRevealed ? (
                <span
                  className={`badge ${
                    direction === 'inhale'
                      ? 'badge-down'
                      : direction === 'exhale'
                        ? 'badge-up'
                        : 'badge-neutral'
                  }`}
                  style={{ justifyContent: 'flex-start' }}
                >
                  {pressureCompareText}
                </span>
              ) : (
                <button
                  type="button"
                  className="blind-pill is-hidden"
                  onClick={() => onRevealLabel('mechanics_pressure_cmp')}
                >
                  ? (높음/낮음)
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                공기 이동 방향
              </span>
              {isAirflowDirRevealed ? (
                <span className={`badge ${directionBadgeClass}`} style={{ justifyContent: 'flex-start' }}>
                  {airflowDirectionText}
                </span>
              ) : (
                <button
                  type="button"
                  className="blind-pill is-hidden"
                  onClick={() => onRevealLabel('mechanics_airflow_dir')}
                >
                  ? (유입/유출)
                </button>
              )}
            </div>
          </div>

          {/* Live Dual-Curve SVG Chart (Lung Volume & Alveolar Pressure vs Time) */}
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-border-light)',
              flex: '1 1 auto',
              minHeight: '132px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              <span>실시간 부피 · 압력 변화 곡선 (P × V 반비례)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#0284c7' }}>━ 폐 부피(mL)</span>
                <span style={{ color: '#e11d48' }}>━ 폐 압력(mmHg)</span>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
              style={{ width: '100%', height: '106px', display: 'block' }}
              role="img"
              aria-label="시간에 따른 폐 부피와 폐 내부 압력의 반비례 실시간 그래프"
            >
              {/* Plot frame */}
              <rect
                x={chartGeometry.padLeft}
                y={chartGeometry.padTop}
                width={chartGeometry.plotW}
                height={chartGeometry.plotH}
                fill="#f8fafc"
                stroke="#e2e8f0"
                rx={4}
              />

              {/* 760 mmHg atmospheric baseline */}
              <line
                x1={chartGeometry.padLeft}
                y1={chartGeometry.baselineY}
                x2={chartGeometry.padLeft + chartGeometry.plotW}
                y2={chartGeometry.baselineY}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={chartGeometry.width - 2}
                y={chartGeometry.baselineY + 3}
                textAnchor="end"
                fontSize="8.5"
                fill="#64748b"
                fontFamily="var(--font-mono)"
              >
                760
              </text>

              {/* Axis labels */}
              <text
                x={chartGeometry.padLeft - 4}
                y={chartGeometry.padTop + 8}
                textAnchor="end"
                fontSize="8.5"
                fill="#0284c7"
                fontFamily="var(--font-mono)"
              >
                2800
              </text>
              <text
                x={chartGeometry.padLeft - 4}
                y={chartGeometry.padTop + chartGeometry.plotH}
                textAnchor="end"
                fontSize="8.5"
                fill="#0284c7"
                fontFamily="var(--font-mono)"
              >
                2000
              </text>
              <text
                x={chartGeometry.width - 2}
                y={chartGeometry.padTop + 8}
                textAnchor="end"
                fontSize="8.5"
                fill="#e11d48"
                fontFamily="var(--font-mono)"
              >
                767
              </text>
              <text
                x={chartGeometry.width - 2}
                y={chartGeometry.padTop + chartGeometry.plotH}
                textAnchor="end"
                fontSize="8.5"
                fill="#e11d48"
                fontFamily="var(--font-mono)"
              >
                753
              </text>

              {/* Volume curve */}
              <path
                d={chartGeometry.volPath}
                fill="none"
                stroke="#0284c7"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Pressure curve */}
              <path
                d={chartGeometry.pressPath}
                fill="none"
                stroke="#e11d48"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Current value indicator dots */}
              <circle
                cx={chartGeometry.lastX}
                cy={chartGeometry.lastVolY}
                r={3.5}
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth={1.2}
              />
              <circle
                cx={chartGeometry.lastX}
                cy={chartGeometry.lastPressY}
                r={3.5}
                fill="#e11d48"
                stroke="#ffffff"
                strokeWidth={1.2}
              />

              <text
                x={chartGeometry.padLeft + chartGeometry.plotW / 2}
                y={chartGeometry.height - 3}
                textAnchor="middle"
                fontSize="8.5"
                fill="#64748b"
              >
                시간 (t) → 부피(▲)일 때 압력(▼) 확인
              </text>
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
};
