import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Columns2,
  Eye,
  Hand,
  Lock,
  RotateCcw,
} from 'lucide-react';
import {
  BottleHumanTargetId,
  BottleMappingItem,
  RespirationDataset,
} from '../types/respiration';
import { RESPIRATION_PALETTE } from '../styles/palette';
import { ThoraxAnatomySvg } from './visuals/ThoraxAnatomySvg';

export interface BottleModelSimulatorProps {
  dataset: RespirationDataset;
  blindMode: boolean;
  revealedLabels: Record<string, boolean>;
  onRevealLabel: (key: string) => void;
  onBottleStateChange?: (state: {
    phase: number;
    direction: 'inhale' | 'exhale' | 'neutral';
    bottlePressureMmHg: number;
  }) => void;
}

type DirectionState = 'inhale' | 'exhale' | 'neutral';

const DIRECTION_THRESHOLD = 0.06;
const MAX_MEMBRANE_TRAVEL_SVG = 34;
const SVG_VIEWBOX_WIDTH = 320;
const SVG_VIEWBOX_HEIGHT = 380;

function clampPhase(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function getBottleDirection(phase: number): DirectionState {
  if (phase > DIRECTION_THRESHOLD) return 'inhale';
  if (phase < -DIRECTION_THRESHOLD) return 'exhale';
  return 'neutral';
}

/**
 * Computes internal bottle pressure (mmHg) from diaphragm membrane displacement
 * using Boyle's law (P1 * V1 = P2 * V2) around baseline atmospheric pressure.
 */
function computeBottlePressureMmHg(phase: number, baselineMmHg: number): number {
  if (Math.abs(phase) <= 0.01) {
    return baselineMmHg;
  }
  // Pulling membrane down (+1) increases effective bottle volume by ~2.5% prior to equilibration
  const volumeRatio = 1 + phase * 0.025;
  return Number((baselineMmHg / volumeRatio).toFixed(1));
}

interface BottleModelSvgProps {
  phase: number;
  direction: DirectionState;
  bottlePressureMmHg: number;
  baselinePressureMmHg: number;
  selectedMappingId: string | null;
  onSelectMapping: (mappingId: string) => void;
  onPhaseChange: (nextPhase: number) => void;
  onCancelPresetTween: () => void;
}

/**
 * Interactive SVG representation of the plastic bottle lung model with
 * pointer-captured rubber membrane dragging, rigid wall brackets, and RAF airflow.
 */
const BottleModelSvg: React.FC<BottleModelSvgProps> = ({
  phase,
  direction,
  bottlePressureMmHg,
  baselinePressureMmHg,
  selectedMappingId,
  onSelectMapping,
  onPhaseChange,
  onCancelPresetTween,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientY: number;
    startPhase: number;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [airflowTick, setAirflowTick] = useState(0);

  // Smooth airflow animation loop only while air is actively moving
  useEffect(() => {
    if (direction === 'neutral') {
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const speed = 0.65 + Math.abs(phase) * 0.85;
      setAirflowTick((prev) => (prev + dt * speed) % 1);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [direction, phase]);

  const handleMembranePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onCancelPresetTween();
      onSelectMapping('rubber_sheet');
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startClientY: e.clientY,
        startPhase: phase,
      };
      setIsDragging(true);
    },
    [onCancelPresetTween, onSelectMapping, phase]
  );

  const handleMembranePointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId || !svgRef.current) {
        return;
      }

      const rect = svgRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;

      // Convert pixel delta to SVG viewBox units (maintaining preserveAspectRatio scale)
      const scale = Math.min(rect.width / SVG_VIEWBOX_WIDTH, rect.height / SVG_VIEWBOX_HEIGHT);
      const deltaSvgY = (e.clientY - drag.startClientY) / Math.max(0.1, scale);
      const nextPhase = clampPhase(drag.startPhase + deltaSvgY / MAX_MEMBRANE_TRAVEL_SVG);
      onPhaseChange(nextPhase);
    },
    [onPhaseChange]
  );

  const handleMembranePointerEnd = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) {
        return;
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragRef.current = null;
      setIsDragging(false);
    },
    []
  );

  // Derived SVG geometry
  const membraneApexY = 294 + phase * MAX_MEMBRANE_TRAVEL_SVG;
  const membraneControlY = 294 + phase * (MAX_MEMBRANE_TRAVEL_SVG * 2);
  const balloonScale = 1 + phase * 0.28;

  const isSelected = (id: string) => selectedMappingId === id;

  // Internal bottle cavity tint reflecting Boyle's law pressure shift
  const cavityFill = useMemo(() => {
    if (direction === 'inhale') {
      const alpha = 0.25 + Math.abs(phase) * 0.45;
      return `rgba(224, 247, 250, ${alpha.toFixed(2)})`;
    }
    if (direction === 'exhale') {
      const alpha = 0.25 + Math.abs(phase) * 0.45;
      return `rgba(255, 243, 230, ${alpha.toFixed(2)})`;
    }
    return 'rgba(241, 245, 249, 0.72)';
  }, [direction, phase]);

  // Pressure gauge needle angle (-95 deg = low pressure, 0 deg = 760, +95 deg = high pressure)
  const pressureDelta = bottlePressureMmHg - baselinePressureMmHg;
  const needleAngleDeg = Math.max(-95, Math.min(95, (pressureDelta / 20) * 95));

  // Compute airflow particles along the Y-tube & branches
  const particles = useMemo(() => {
    if (direction === 'neutral') return [];

    const count = 4;
    const list: Array<{ x: number; y: number; opacity: number; key: string }> = [];
    for (let i = 0; i < count; i += 1) {
      const raw = (airflowTick + i / count) % 1;
      const u = direction === 'inhale' ? raw : 1 - raw;

      // Fade at top entry and inside balloons
      const edgeFade = Math.min(u * 5, (1 - u) * 5, 1);
      const opacity = Math.max(0.15, Math.min(1, edgeFade)) * (0.45 + Math.abs(phase) * 0.55);

      if (u <= 0.56) {
        const stemT = u / 0.56;
        list.push({
          key: `stem-${i}`,
          x: 160,
          y: 12 + stemT * 120,
          opacity,
        });
      } else {
        const branchT = (u - 0.56) / 0.44;
        list.push({
          key: `left-${i}`,
          x: 160 - branchT * 44,
          y: 132 + branchT * 36,
          opacity,
        });
        list.push({
          key: `right-${i}`,
          x: 160 + branchT * 44,
          y: 132 + branchT * 36,
          opacity,
        });
      }
    }
    return list;
  }, [airflowTick, direction, phase]);

  const flowColor =
    direction === 'inhale' ? RESPIRATION_PALETTE.inhale : RESPIRATION_PALETTE.exhale;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
      className="select-none"
      role="img"
      aria-label="페트병 호흡 모형 인터랙티브 시뮬레이션"
      style={{ touchAction: 'pan-y' }}
    >
      <defs>
        <linearGradient id="bottlePlasticSheen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="18%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.32" />
        </linearGradient>

        <radialGradient id="balloonFillGrad" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#ffe4e6" />
          <stop offset="55%" stopColor={RESPIRATION_PALETTE.lungTissue} />
          <stop offset="100%" stopColor="#fb7185" />
        </radialGradient>

        <filter id="partHighlightGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#0284c7" floodOpacity="0.55" />
        </filter>
        <filter id="limitationGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.7" />
        </filter>
      </defs>

      {/* Atmospheric Pressure Header Badge */}
      <g transform="translate(12, 12)">
        <rect
          x="0"
          y="0"
          width="114"
          height="36"
          rx="8"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="1.2"
        />
        <text x="10" y="15" fontSize="9.5" fontWeight="700" fill="#64748b">
          외부 대기압
        </text>
        <text
          x="10"
          y="29"
          fontSize="12"
          fontWeight="800"
          fontFamily="var(--font-mono)"
          fill="#0f172a"
        >
          {baselinePressureMmHg} mmHg
        </text>
      </g>

      {/* Pressure Gauge connected to bottle interior */}
      <g transform="translate(268, 52)">
        {/* Sensor tube into bottle shoulder */}
        <path
          d="M -22 22 L -32 22 Q -42 22 -42 36 L -42 74"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="-42" cy="74" r="3.5" fill="#475569" />

        {/* Gauge housing */}
        <circle
          cx="0"
          cy="0"
          r="34"
          fill="#ffffff"
          stroke={
            direction === 'inhale'
              ? RESPIRATION_PALETTE.inhale
              : direction === 'exhale'
              ? RESPIRATION_PALETTE.exhale
              : '#94a3b8'
          }
          strokeWidth="2.5"
        />
        {/* Low pressure arc (left) & High pressure arc (right) */}
        <path
          d="M -22 10 A 24 24 0 0 1 0 -24"
          fill="none"
          stroke={RESPIRATION_PALETTE.inhale}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 0 -24 A 24 24 0 0 1 22 10"
          fill="none"
          stroke={RESPIRATION_PALETTE.exhale}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Baseline tick */}
        <line x1="0" y1="-27" x2="0" y2="-19" stroke="#0f172a" strokeWidth="2" />

        {/* Rotating needle */}
        <g transform={`rotate(${needleAngleDeg})`}>
          <line
            x1="0"
            y1="5"
            x2="0"
            y2="-21"
            stroke="#0f172a"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="0" cy="0" r="3.8" fill="#0f172a" />
        </g>

        <text x="0" y="15" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#64748b">
          병 내부 압력
        </text>
        <rect
          x="-38"
          y="37"
          width="76"
          height="21"
          rx="6"
          fill={
            direction === 'inhale'
              ? '#e0f7fa'
              : direction === 'exhale'
              ? '#fff3e6'
              : '#f1f5f9'
          }
          stroke={
            direction === 'inhale'
              ? '#7dd3fc'
              : direction === 'exhale'
              ? '#fdba74'
              : '#cbd5e1'
          }
        />
        <text
          x="0"
          y="51"
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="800"
          fontFamily="var(--font-mono)"
          fill={
            direction === 'inhale'
              ? '#0369a1'
              : direction === 'exhale'
              ? '#c2410c'
              : '#0f172a'
          }
        >
          {bottlePressureMmHg.toFixed(1)}
        </text>
      </g>

      {/* 1. Bottle Internal Space (clickable: bottle_space) */}
      <g
        className="svg-organ-node"
        onClick={() => onSelectMapping('bottle_space')}
        filter={isSelected('bottle_space') ? 'url(#partHighlightGlow)' : undefined}
      >
        <path
          d={`M 134 98 Q 134 114 98 124 Q 72 132 72 152 L 72 294 Q 160 ${membraneControlY} 248 294 L 248 152 Q 248 132 222 124 Q 186 114 186 98 Z`}
          fill={cavityFill}
          stroke={isSelected('bottle_space') ? '#0284c7' : 'none'}
          strokeWidth={isSelected('bottle_space') ? 2.5 : 0}
        />
        <text
          x="160"
          y="256"
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="700"
          fill={isSelected('bottle_space') ? '#0369a1' : '#64748b'}
          opacity={direction === 'neutral' ? 0.9 : 0.75}
        >
          페트병 내부 공간
        </text>
      </g>

      {/* 2. Two Rubber Balloons (clickable: balloons) */}
      <g
        className="svg-organ-node"
        onClick={() => onSelectMapping('balloons')}
        filter={isSelected('balloons') ? 'url(#partHighlightGlow)' : undefined}
      >
        {/* Left Balloon anchored at (116, 162) */}
        <g transform={`translate(116, 162) scale(${balloonScale}) translate(-116, -162)`}>
          <path
            d="M 111 162 C 102 172, 90 186, 90 205 C 90 223, 102 233, 116 233 C 130 233, 142 223, 142 205 C 142 186, 130 172, 121 162 Z"
            fill="url(#balloonFillGrad)"
            stroke={isSelected('balloons') ? '#0284c7' : '#e11d48'}
            strokeWidth={isSelected('balloons') ? 3 : 2}
          />
          <ellipse cx="105" cy="196" rx="5.5" ry="12" fill="#ffffff" opacity="0.38" />
        </g>

        {/* Right Balloon anchored at (204, 162) */}
        <g transform={`translate(204, 162) scale(${balloonScale}) translate(-204, -162)`}>
          <path
            d="M 199 162 C 190 172, 178 186, 178 205 C 178 223, 190 233, 204 233 C 218 233, 230 223, 230 205 C 230 186, 218 172, 209 162 Z"
            fill="url(#balloonFillGrad)"
            stroke={isSelected('balloons') ? '#0284c7' : '#e11d48'}
            strokeWidth={isSelected('balloons') ? 3 : 2}
          />
          <ellipse cx="193" cy="196" rx="5.5" ry="12" fill="#ffffff" opacity="0.38" />
        </g>

        {/* Balloon neck elastic bands */}
        <rect x="109" y="159" width="14" height="5" rx="2" fill="#be123c" />
        <rect x="197" y="159" width="14" height="5" rx="2" fill="#be123c" />
      </g>

      {/* 3. Rubber Stopper (Bottle neck seal) */}
      <path
        d="M 131 64 L 189 64 L 184 96 L 136 96 Z"
        fill="#475569"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <rect x="129" y="60" width="62" height="6" rx="3" fill="#64748b" />

      {/* 4. Y-Tube (clickable: y_tube) */}
      <g
        className="svg-organ-node"
        onClick={() => onSelectMapping('y_tube')}
        filter={isSelected('y_tube') ? 'url(#partHighlightGlow)' : undefined}
      >
        {/* Outer glass/plastic wall */}
        <path
          d="M 160 18 L 160 132 M 160 132 L 116 162 M 160 132 L 204 162"
          fill="none"
          stroke={isSelected('y_tube') ? '#0284c7' : '#94a3b8'}
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner hollow channel */}
        <path
          d="M 160 18 L 160 132 M 160 132 L 116 162 M 160 132 L 204 162"
          fill="none"
          stroke="#f8fafc"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Top flared rim */}
        <ellipse
          cx="160"
          cy="18"
          rx="11"
          ry="4"
          fill="#e2e8f0"
          stroke={isSelected('y_tube') ? '#0284c7' : '#64748b'}
          strokeWidth="1.8"
        />
      </g>

      {/* 5. Airflow Particles & Directional Arrows */}
      {direction !== 'neutral' && (
        <g pointerEvents="none">
          {particles.map((p) => (
            <circle
              key={p.key}
              cx={p.x}
              cy={p.y}
              r="3.8"
              fill={flowColor}
              opacity={p.opacity}
            />
          ))}

          {/* Clear directional arrow above Y-tube */}
          {direction === 'inhale' ? (
            <g transform="translate(160, 8)">
              <path
                d="M -7 -2 L 0 7 L 7 -2"
                fill="none"
                stroke={RESPIRATION_PALETTE.inhale}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : (
            <g transform="translate(160, 10)">
              <path
                d="M -7 5 L 0 -4 L 7 5"
                fill="none"
                stroke={RESPIRATION_PALETTE.exhale}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
        </g>
      )}

      {/* 6. Rigid Plastic Bottle Wall & Fixed Lock Brackets (clickable: bottle_wall) */}
      <g
        className="svg-organ-node"
        onClick={() => onSelectMapping('bottle_wall')}
        filter={isSelected('bottle_wall') ? 'url(#limitationGlow)' : undefined}
      >
        {/* Plastic surface sheen overlay */}
        <path
          d="M 132 70 L 132 98 Q 132 114 98 124 Q 72 132 72 152 L 72 294 L 248 294 L 248 152 Q 248 132 222 124 Q 188 114 188 98 L 188 70"
          fill="url(#bottlePlasticSheen)"
          pointerEvents="none"
        />

        {/* Rigid bottle outer wall strokes */}
        <path
          d="M 132 68 L 132 98 Q 132 114 98 124 Q 72 132 72 152 L 72 294"
          fill="none"
          stroke={isSelected('bottle_wall') ? '#d97706' : '#475569'}
          strokeWidth={isSelected('bottle_wall') ? 5.5 : 4.5}
          strokeLinecap="round"
        />
        <path
          d="M 188 68 L 188 98 Q 188 114 222 124 Q 248 132 248 152 L 248 294"
          fill="none"
          stroke={isSelected('bottle_wall') ? '#d97706' : '#475569'}
          strokeWidth={isSelected('bottle_wall') ? 5.5 : 4.5}
          strokeLinecap="round"
        />

        {/* Bottle neck collar */}
        <rect
          x="128"
          y="72"
          width="64"
          height="7"
          rx="3"
          fill="none"
          stroke={isSelected('bottle_wall') ? '#d97706' : '#64748b'}
          strokeWidth="2"
        />

        {/* Rigid Fixed Reference Lines (never move!) */}
        <line
          x1="64"
          y1="146"
          x2="64"
          y2="294"
          stroke={isSelected('bottle_wall') ? '#f59e0b' : '#94a3b8'}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <line
          x1="256"
          y1="146"
          x2="256"
          y2="294"
          stroke={isSelected('bottle_wall') ? '#f59e0b' : '#94a3b8'}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Left Fixed Clamp Bracket */}
        <g transform="translate(30, 186)">
          <rect
            x="0"
            y="0"
            width="38"
            height="48"
            rx="6"
            fill={isSelected('bottle_wall') ? '#fef3c7' : '#e2e8f0'}
            stroke={isSelected('bottle_wall') ? '#d97706' : '#64748b'}
            strokeWidth="1.8"
          />
          <rect x="34" y="14" width="10" height="20" rx="2" fill="#475569" />
          {/* Padlock glyph */}
          <rect x="11" y="17" width="14" height="11" rx="2" fill="#475569" />
          <path
            d="M 14 17 V 13 A 4 4 0 0 1 22 13 V 17"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
          />
          <text x="19" y="41" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#334155">
            고정벽
          </text>
        </g>

        {/* Right Fixed Clamp Bracket */}
        <g transform="translate(252, 186)">
          <rect
            x="0"
            y="0"
            width="38"
            height="48"
            rx="6"
            fill={isSelected('bottle_wall') ? '#fef3c7' : '#e2e8f0'}
            stroke={isSelected('bottle_wall') ? '#d97706' : '#64748b'}
            strokeWidth="1.8"
          />
          <rect x="-6" y="14" width="10" height="20" rx="2" fill="#475569" />
          {/* Padlock glyph */}
          <rect x="13" y="17" width="14" height="11" rx="2" fill="#475569" />
          <path
            d="M 16 17 V 13 A 4 4 0 0 1 24 13 V 17"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
          />
          <text x="19" y="41" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#334155">
            이동✕
          </text>
        </g>
      </g>

      {/* 7. Bottom Rubber Membrane + Interactive Drag Handle (clickable & draggable: rubber_sheet) */}
      <g
        onPointerDown={handleMembranePointerDown}
        onPointerMove={handleMembranePointerMove}
        onPointerUp={handleMembranePointerEnd}
        onPointerCancel={handleMembranePointerEnd}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        filter={isSelected('rubber_sheet') ? 'url(#partHighlightGlow)' : undefined}
      >
        {/* Side rubber cuffs holding the membrane onto the cut bottle edge */}
        <rect x="68" y="287" width="8" height="14" rx="3" fill="#be123c" />
        <rect x="244" y="287" width="8" height="14" rx="3" fill="#be123c" />

        {/* Elastic membrane body */}
        <path
          d={`M 72 294 Q 160 ${membraneControlY} 248 294`}
          fill="none"
          stroke={isSelected('rubber_sheet') ? '#0284c7' : RESPIRATION_PALETTE.diaphragm}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M 72 294 Q 160 ${membraneControlY} 248 294`}
          fill="none"
          stroke="#fda4af"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Stem + Grip Handle Knob */}
        <line
          x1="160"
          y1={membraneApexY + 2}
          x2="160"
          y2={membraneApexY + 18}
          stroke="#9f1239"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <rect
          x="122"
          y={membraneApexY + 15}
          width="76"
          height="24"
          rx="12"
          fill={isDragging ? '#0f172a' : '#be123c'}
          stroke="#ffffff"
          strokeWidth="2"
        />
        <text
          x="160"
          y={membraneApexY + 31}
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="800"
          fill="#ffffff"
          pointerEvents="none"
        >
          ▲▼ 고무막 드래그
        </text>

        {/* Generous invisible hit area for touch/smartboard dragging */}
        <rect
          x="74"
          y={membraneApexY - 22}
          width="172"
          height="72"
          rx="16"
          fill="transparent"
        />
      </g>

      {/* Compact inline part tags on the bottle */}
      <g pointerEvents="none" fontSize="9.5" fontWeight="700">
        <text x="180" y="48" fill="#475569">
          Y자관
        </text>
        <text x="116" y="152" textAnchor="middle" fill="#9f1239">
          고무풍선
        </text>
      </g>
    </svg>
  );
};

interface MappingCardProps {
  item: BottleMappingItem;
  isSelected: boolean;
  blindMode: boolean;
  isRevealed: boolean;
  onSelect: () => void;
  onReveal: () => void;
}

/**
 * Interactive 1:1 correspondence card linking a bottle model component
 * to its anatomical counterpart and highlighting scientific limitations.
 */
const MappingCard: React.FC<MappingCardProps> = ({
  item,
  isSelected,
  blindMode,
  isRevealed,
  onSelect,
  onReveal,
}) => {
  const showLimitationDetail = isSelected || item.isLimitationHighlighted;
  const shouldHideHumanName = blindMode && !isRevealed;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        border: isSelected
          ? `2px solid ${item.isLimitationHighlighted ? '#d97706' : 'var(--color-inhale-dark)'}`
          : item.isLimitationHighlighted
          ? '2px solid #fbbf24'
          : '1px solid var(--color-border-light)',
        backgroundColor: isSelected
          ? item.isLimitationHighlighted
            ? '#fffbeb'
            : '#f0f9ff'
          : item.isLimitationHighlighted
          ? '#fefce8'
          : '#ffffff',
        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Top mapping row: Bottle part <-> Human organ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: '0.92rem',
              color: 'var(--color-text)',
            }}
          >
            {item.bottlePartName}
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>↔</span>

          {shouldHideHumanName ? (
            <button
              type="button"
              className="blind-pill is-hidden"
              onClick={(e) => {
                e.stopPropagation();
                onReveal();
              }}
              title="클릭하여 인체 기관 이름 확인"
            >
              <span>?</span>
              <Eye size={12} />
            </button>
          ) : (
            <span
              className={blindMode ? 'blind-pill is-revealed' : 'badge badge-inhale'}
              style={{ fontSize: '0.82rem' }}
            >
              {item.humanOrganName}
            </span>
          )}
        </div>

        {item.isLimitationHighlighted && (
          <span
            className="badge badge-warning"
            style={{
              gap: '4px',
              animation: 'none',
              borderWidth: '1.5px',
            }}
          >
            <AlertTriangle size={13} />
            핵심 한계점
          </span>
        )}
      </div>

      {/* Role description */}
      <p
        style={{
          margin: '6px 0 0',
          fontSize: '0.82rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.45,
        }}
      >
        {item.roleDescription}
      </p>

      {/* Limitation callout (always visible for highlighted limitation & selected card) */}
      {showLimitationDetail && (
        <div
          className={item.isLimitationHighlighted ? 'callout-warning' : 'callout-tip'}
          style={{ marginTop: '8px', fontSize: '0.8rem', padding: '7px 10px' }}
        >
          <strong style={{ display: 'block', marginBottom: '2px' }}>
            {item.isLimitationHighlighted ? '모형 vs 인체 결정적 차이' : '모형의 한계점'}
          </strong>
          {item.limitationNote}
        </div>
      )}
    </div>
  );
};

/**
 * Interactive Plastic Bottle Lung Model simulator paired with side-by-side
 * human thorax comparison and 1:1 structural correspondence cards.
 */
export const BottleModelSimulator: React.FC<BottleModelSimulatorProps> = ({
  dataset,
  blindMode,
  revealedLabels,
  onRevealLabel,
  onBottleStateChange,
}) => {
  const [phase, setPhase] = useState<number>(0);
  const [compareMode, setCompareMode] = useState<boolean>(true);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>('bottle_wall');

  const tweenRafRef = useRef<number | null>(null);
  const onBottleStateChangeRef = useRef(onBottleStateChange);
  onBottleStateChangeRef.current = onBottleStateChange;

  const baselineMmHg = dataset.physicsParams.baselinePressureMmHg;
  const direction = getBottleDirection(phase);
  const bottlePressureMmHg = computeBottlePressureMmHg(phase, baselineMmHg);

  // Notify parent container whenever bottle phase/pressure changes
  useEffect(() => {
    onBottleStateChangeRef.current?.({
      phase,
      direction,
      bottlePressureMmHg,
    });
  }, [phase, direction, bottlePressureMmHg]);

  // Cancel any running preset animation on unmount
  useEffect(() => {
    return () => {
      if (tweenRafRef.current !== null) {
        cancelAnimationFrame(tweenRafRef.current);
      }
    };
  }, []);

  const cancelPresetTween = useCallback(() => {
    if (tweenRafRef.current !== null) {
      cancelAnimationFrame(tweenRafRef.current);
      tweenRafRef.current = null;
    }
  }, []);

  const animatePhaseTo = useCallback(
    (targetPhase: number) => {
      cancelPresetTween();
      const startPhase = phase;
      const startTime = performance.now();
      const durationMs = 340;

      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        // Smooth ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        const next = startPhase + (targetPhase - startPhase) * eased;
        setPhase(clampPhase(next));
        if (t < 1) {
          tweenRafRef.current = requestAnimationFrame(tick);
        } else {
          tweenRafRef.current = null;
        }
      };

      tweenRafRef.current = requestAnimationFrame(tick);
    },
    [cancelPresetTween, phase]
  );

  const selectedMapping = useMemo(
    () => dataset.bottleMappings.find((m) => m.id === selectedMappingId) ?? null,
    [dataset.bottleMappings, selectedMappingId]
  );

  const selectedTarget: BottleHumanTargetId | null = selectedMapping?.humanOrganId ?? null;

  const volumeDeltaPct = Math.round(phase * 28);

  return (
    <div className="lab-grid-2col">
      {/* Left Stage: Bottle Lung Model + Optional Side-by-Side Human Thorax */}
      <section className="lab-card" aria-label="페트병 호흡 모형 실험 무대">
        <div className="lab-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 className="lab-card-title">페트병 호흡 모형 실험기</h2>
            {direction === 'inhale' && (
              <span className="badge badge-inhale">
                <ArrowDown size={13} /> 들숨 (공기 유입)
              </span>
            )}
            {direction === 'exhale' && (
              <span className="badge badge-exhale">
                <ArrowUp size={13} /> 날숨 (공기 유출)
              </span>
            )}
            {direction === 'neutral' && <span className="badge badge-neutral">평형 상태</span>}
          </div>

          <button
            type="button"
            className={`btn ${compareMode ? 'btn-primary' : ''}`}
            onClick={() => setCompareMode((prev) => !prev)}
            style={{ fontSize: '0.8rem', padding: '5px 10px' }}
          >
            <Columns2 size={15} />
            {compareMode ? '인체 나란히 비교 ON' : '인체 나란히 비교 OFF'}
          </button>
        </div>

        <div className="lab-card-body no-scroll" style={{ gap: '8px' }}>
          {/* Quick-action preset buttons + live metrics */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                onClick={() => animatePhaseTo(0.95)}
                style={{
                  backgroundColor: phase > 0.6 ? 'var(--color-inhale-soft)' : undefined,
                  borderColor: phase > 0.6 ? 'var(--color-inhale)' : undefined,
                  color: phase > 0.6 ? 'var(--color-inhale-dark)' : undefined,
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                }}
              >
                <ArrowDown size={14} /> 고무막 당기기 (들숨)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => animatePhaseTo(0)}
                style={{ padding: '6px 10px', fontSize: '0.82rem' }}
              >
                <RotateCcw size={13} /> 원래대로
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => animatePhaseTo(-0.95)}
                style={{
                  backgroundColor: phase < -0.6 ? 'var(--color-exhale-soft)' : undefined,
                  borderColor: phase < -0.6 ? 'var(--color-exhale)' : undefined,
                  color: phase < -0.6 ? 'var(--color-exhale-dark)' : undefined,
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                }}
              >
                <ArrowUp size={14} /> 고무막 밀기 (날숨)
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                내부 압력 {bottlePressureMmHg.toFixed(1)} mmHg
              </span>
              <span
                className={
                  volumeDeltaPct > 0
                    ? 'badge badge-up'
                    : volumeDeltaPct < 0
                    ? 'badge badge-down'
                    : 'badge badge-neutral'
                }
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                풍선 {volumeDeltaPct > 0 ? `+${volumeDeltaPct}%` : `${volumeDeltaPct}%`}
              </span>
            </div>
          </div>

          {/* Interactive Stage: Bottle Model (+ Side-by-Side Thorax) */}
          <div
            style={{
              flex: '1 1 0',
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: compareMode ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
              gap: '8px',
            }}
          >
            {/* Plastic Bottle SVG Pane */}
            <div
              className="svg-stage"
              style={{ flexDirection: 'column', padding: '4px 6px', justifyContent: 'space-between' }}
            >
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 4px',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                  페트병 호흡 모형
                </span>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                  <Lock size={11} /> 벽면 고정 (움직임 ✕)
                </span>
              </div>

              <div style={{ flex: '1 1 0', minHeight: 0, width: '100%' }}>
                <BottleModelSvg
                  phase={phase}
                  direction={direction}
                  bottlePressureMmHg={bottlePressureMmHg}
                  baselinePressureMmHg={baselineMmHg}
                  selectedMappingId={selectedMappingId}
                  onSelectMapping={(id) => setSelectedMappingId(id)}
                  onPhaseChange={(next) => setPhase(next)}
                  onCancelPresetTween={cancelPresetTween}
                />
              </div>

              <div
                style={{
                  fontSize: '0.73rem',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <Hand size={12} /> 아래 고무막 손잡이를 마우스나 터치로 위아래로 드래그하세요.
              </div>
            </div>

            {/* Side-by-Side Human Thorax Anatomy Pane */}
            {compareMode && (
              <div
                className="svg-stage"
                style={{ flexDirection: 'column', padding: '4px 6px', justifyContent: 'space-between' }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '2px 4px',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                    실제 인체 흉곽 (동시 비교)
                  </span>
                  <span className="badge badge-up" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                    갈비뼈: 상하·좌우 확장 ✓
                  </span>
                </div>

                <div style={{ flex: '1 1 0', minHeight: 0, width: '100%' }}>
                  <ThoraxAnatomySvg
                    phase={phase}
                    selectedTarget={selectedTarget}
                    blindMode={blindMode}
                    revealedLabels={revealedLabels}
                    onRevealLabel={onRevealLabel}
                    showLabels={true}
                  />
                </div>

                <div
                  style={{
                    fontSize: '0.73rem',
                    color: 'var(--color-inhale-dark)',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  갈비뼈가 바깥쪽·위쪽으로 회전하며 흉강을 입체적으로 넓힘
                </div>
              </div>
            )}
          </div>

          {/* Critical Scientific Limitation Banner */}
          <div
            className="callout-warning"
            style={{
              flexShrink: 0,
              padding: '7px 10px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, color: '#b45309' }} />
            <span>
              <strong>핵심 차이점:</strong> 페트병 벽면은 갈비뼈처럼 상하·좌우로 움직이지 못함!
              (모형에서는 바닥의 고무막 이동만으로 부피가 변합니다.)
            </span>
          </div>
        </div>
      </section>

      {/* Right Panel: 1:1 Structure Correspondence & Limitation Cards */}
      <section className="lab-card" aria-label="1대1 구조 대응 및 모형의 한계점">
        <div className="lab-card-header">
          <h2 className="lab-card-title">1:1 구조 대응 및 모형의 한계점</h2>
          <span className="badge badge-neutral">{dataset.bottleMappings.length}개 구조 대응</span>
        </div>

        <div className="lab-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            아래 카드나 왼쪽 페트병 모형의 각 부위를 클릭하면 모형과 인체 흉곽의 대응 구조가 함께
            강조됩니다.
          </div>

          {dataset.bottleMappings.map((item) => {
            const revealKey = `bottle_${item.id}`;
            return (
              <MappingCard
                key={item.id}
                item={item}
                isSelected={selectedMappingId === item.id}
                blindMode={blindMode}
                isRevealed={Boolean(revealedLabels[revealKey])}
                onSelect={() =>
                  setSelectedMappingId((prev) => (prev === item.id ? null : item.id))
                }
                onReveal={() => onRevealLabel(revealKey)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
};
