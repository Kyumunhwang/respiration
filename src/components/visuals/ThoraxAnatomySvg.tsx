import React from 'react';
import { BottleHumanTargetId, OrganId } from '../../types/respiration';
import { RESPIRATION_PALETTE } from '../../styles/palette';

export interface ThoraxAnatomySvgProps {
  /** Breathing phase: -1 (max exhale) .. 0 (rest) .. +1 (max inhale). Default 0. */
  phase?: number;
  /** Currently highlighted anatomy target (supports both OrganId and bottle-mapping targets). */
  selectedTarget?: BottleHumanTargetId | null;
  /** Callback invoked when the user clicks one of the 5 clickable organs. */
  onSelectOrgan?: (id: OrganId) => void;
  /** Hides Korean labels behind clickable `?` badges for classroom questioning. */
  blindMode?: boolean;
  /** Map of label keys ('nasal', 'trachea', 'bronchi', 'lungs', 'alveoli', 'ribcage', 'diaphragm') revealed in blindMode. */
  revealedLabels?: Record<string, boolean>;
  /** Callback invoked when a hidden `?` badge is clicked in blindMode. */
  onRevealLabel?: (key: string) => void;
  /** Whether to render callout labels. Default true. */
  showLabels?: boolean;
  /** Whether to render the ribcage layer. Default true. */
  showRibs?: boolean;
  className?: string;
}

interface LabelConfig {
  key: BottleHumanTargetId;
  organId?: OrganId;
  text: string;
  side: 'left' | 'right';
  pillX: number;
  pillY: number;
  pillW: number;
  targetX: number;
  targetY: number;
}

const CX = 230;

/**
 * Computes exact thoracic geometry from phase t in [-1, 1], enforcing:
 * - lungBottomY < diaphragmTopY - 6 at all phases
 * - lungScale < cavityScale so a visible pleural gap always remains
 * - ribs rotate smoothly outward and upward without intersecting the diaphragm
 */
function computeThoraxGeometry(rawPhase: number) {
  const t = Math.max(-1, Math.min(1, rawPhase));

  // Thoracic cavity dimensions
  const cavTopY = 152;
  const cavTopHalfW = 54 + t * 4;
  const cavHalfW = 114 + t * 20; // 94 .. 114 .. 134
  const cavBottomLatY = 368 + t * 12; // 356 .. 368 .. 380

  // Diaphragm dimensions (flattens & descends as t increases)
  const diaLeftX = CX - (cavHalfW - 2);
  const diaRightX = CX + (cavHalfW - 2);
  const diaEdgeY = cavBottomLatY + 6; // 362 .. 374 .. 386
  const diaDomeHeight = 42 - t * 24; // 66 .. 42 .. 18
  const diaTopY = diaEdgeY - diaDomeHeight; // 296 .. 332 .. 368
  const diaCtrlY = diaEdgeY - 2 * diaDomeHeight; // 230 .. 290 .. 350

  // Lungs dimensions (strictly smaller than cavity & >= 8px above diaTopY)
  const lungTopY = 174 - t * 6; // 180 .. 174 .. 168
  const lungInnerGap = 14;
  const lungOuterHalfW = 98 + t * 16; // 82 .. 98 .. 114 (pleural gap 12..20px)
  const lungInnerBottomY = diaTopY - 18; // 278 .. 314 .. 350
  const lungOuterBottomY = diaTopY - 8; // 288 .. 324 .. 360 (always <= diaTopY - 8 < diaTopY - 6)

  // Ribcage motion (rotates upward and outward as t increases)
  const sternumShiftY = -t * 6;
  const ribDropY = 12 - t * 10; // +22 (exhale) .. +12 (rest) .. +2 (inhale)

  return {
    t,
    cavTopY,
    cavTopHalfW,
    cavHalfW,
    cavBottomLatY,
    diaLeftX,
    diaRightX,
    diaEdgeY,
    diaTopY,
    diaCtrlY,
    lungTopY,
    lungInnerGap,
    lungOuterHalfW,
    lungInnerBottomY,
    lungOuterBottomY,
    sternumShiftY,
    ribDropY,
  };
}

export const ThoraxAnatomySvg: React.FC<ThoraxAnatomySvgProps> = ({
  phase = 0,
  selectedTarget = null,
  onSelectOrgan,
  blindMode = false,
  revealedLabels = {},
  onRevealLabel,
  showLabels = true,
  showRibs = true,
  className,
}) => {
  const g = computeThoraxGeometry(phase);

  const isSelected = (id: BottleHumanTargetId): boolean => selectedTarget === id;

  const handleOrganClick = (id: OrganId) => {
    onSelectOrgan?.(id);
  };

  const handleOrganKeyDown = (
    e: React.KeyboardEvent<SVGGElement>,
    id: OrganId
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectOrgan?.(id);
    }
  };

  // Left lung (viewer's left = anatomical right)
  const leftInnerX = CX - g.lungInnerGap;
  const leftOuterX = CX - g.lungOuterHalfW;
  const leftMidX = (leftInnerX + leftOuterX) / 2;
  const leftLungPath = [
    `M ${leftInnerX - 2} ${g.lungTopY + 12}`,
    `C ${leftInnerX - 18} ${g.lungTopY - 4}, ${leftOuterX + 26} ${g.lungTopY - 2}, ${leftOuterX + 12} ${g.lungTopY + 34}`,
    `C ${leftOuterX - 4} ${g.lungTopY + 72}, ${leftOuterX - 4} ${g.lungOuterBottomY - 36}, ${leftOuterX + 2} ${g.lungOuterBottomY}`,
    `Q ${leftMidX} ${g.lungInnerBottomY - 2} ${leftInnerX} ${g.lungInnerBottomY}`,
    `C ${leftInnerX - 2} ${g.lungInnerBottomY - 38}, ${leftInnerX + 2} ${g.lungTopY + 42}, ${leftInnerX - 2} ${g.lungTopY + 12}`,
    'Z',
  ].join(' ');

  // Right lung (viewer's right = anatomical left, with subtle cardiac notch)
  const rightInnerX = CX + g.lungInnerGap;
  const rightOuterX = CX + g.lungOuterHalfW;
  const rightMidX = (rightInnerX + rightOuterX) / 2;
  const rightLungPath = [
    `M ${rightInnerX + 2} ${g.lungTopY + 12}`,
    `C ${rightInnerX + 18} ${g.lungTopY - 4}, ${rightOuterX - 26} ${g.lungTopY - 2}, ${rightOuterX - 12} ${g.lungTopY + 34}`,
    `C ${rightOuterX + 4} ${g.lungTopY + 72}, ${rightOuterX + 4} ${g.lungOuterBottomY - 36}, ${rightOuterX - 2} ${g.lungOuterBottomY}`,
    `Q ${rightMidX} ${g.lungInnerBottomY - 2} ${rightInnerX + 10} ${g.lungInnerBottomY}`,
    `C ${rightInnerX + 20} ${g.lungInnerBottomY - 26}, ${rightInnerX + 4} ${g.lungTopY + 58}, ${rightInnerX + 2} ${g.lungTopY + 12}`,
    'Z',
  ].join(' ');

  // Thoracic cavity closed contour bounding lungs above the diaphragm
  const cavityPath = [
    `M ${CX - g.cavTopHalfW} ${g.cavTopY}`,
    `C ${CX - g.cavHalfW + 8} ${g.cavTopY + 26}, ${CX - g.cavHalfW - 4} ${g.cavBottomLatY - 56}, ${CX - g.cavHalfW} ${g.cavBottomLatY}`,
    `Q ${CX} ${g.diaCtrlY - 4} ${CX + g.cavHalfW} ${g.cavBottomLatY}`,
    `C ${CX + g.cavHalfW + 4} ${g.cavBottomLatY - 56}, ${CX + g.cavHalfW - 8} ${g.cavTopY + 26}, ${CX + g.cavTopHalfW} ${g.cavTopY}`,
    'Z',
  ].join(' ');

  // Diaphragm dome band (upper surface + 14px muscular thickness)
  const diaphragmBandPath = [
    `M ${g.diaLeftX} ${g.diaEdgeY}`,
    `Q ${CX} ${g.diaCtrlY} ${g.diaRightX} ${g.diaEdgeY}`,
    `L ${g.diaRightX} ${g.diaEdgeY + 14}`,
    `Q ${CX} ${g.diaCtrlY + 15} ${g.diaLeftX} ${g.diaEdgeY + 14}`,
    'Z',
  ].join(' ');

  // Bronchi scale factor tracking lung expansion cleanly from carina (230, 186)
  const bronchiScaleX = 0.88 + (g.t + 1) * 0.11;
  const bronchiScaleY = 0.86 + (g.t + 1) * 0.13;

  // Alveoli highlight position inside viewer's right lung
  const alveoliCx = CX + g.lungOuterHalfW * 0.62;
  const alveoliCy = g.lungTopY + (g.lungOuterBottomY - g.lungTopY) * 0.62;

  // Ribcage 6 pairs
  const ribRatios = [0.7, 0.84, 0.94, 0.99, 0.95, 0.86];

  const labels: LabelConfig[] = [
    {
      key: 'nasal',
      organId: 'nasal',
      text: '코 (비강)',
      side: 'left',
      pillX: 12,
      pillY: 40,
      pillW: 84,
      targetX: 196,
      targetY: 54,
    },
    {
      key: 'trachea',
      organId: 'trachea',
      text: '기관',
      side: 'left',
      pillX: 12,
      pillY: 112,
      pillW: 64,
      targetX: 218,
      targetY: 126,
    },
    {
      key: 'ribcage',
      text: '갈비뼈',
      side: 'left',
      pillX: 12,
      pillY: 204,
      pillW: 72,
      targetX: CX - g.cavHalfW * 0.86,
      targetY: 216 + g.ribDropY * 0.4,
    },
    {
      key: 'diaphragm',
      text: '횡격막',
      side: 'left',
      pillX: 12,
      pillY: 368,
      pillW: 72,
      targetX: CX - g.cavHalfW * 0.45,
      targetY: g.diaTopY + 14,
    },
    {
      key: 'bronchi',
      organId: 'bronchi',
      text: '기관지',
      side: 'right',
      pillX: 374,
      pillY: 146,
      pillW: 74,
      targetX: CX + 34 * bronchiScaleX,
      targetY: 206,
    },
    {
      key: 'lungs',
      organId: 'lungs',
      text: '폐',
      side: 'right',
      pillX: 388,
      pillY: 214,
      pillW: 60,
      targetX: rightOuterX - 18,
      targetY: 224,
    },
    {
      key: 'alveoli',
      organId: 'alveoli',
      text: '폐포',
      side: 'right',
      pillX: 382,
      pillY: 286,
      pillW: 66,
      targetX: alveoliCx + 16,
      targetY: alveoliCy,
    },
  ];

  const isInhaling = g.t > 0.08;
  const isExhaling = g.t < -0.08;

  return (
    <svg
      viewBox="0 0 460 480"
      className={className}
      role="img"
      aria-label="인체 호흡계 및 흉강 단면 시뮬레이션"
    >
      <defs>
        <linearGradient id="thorax-body-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor={RESPIRATION_PALETTE.thoraxBg} />
        </linearGradient>
        <linearGradient id="thorax-lung-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={RESPIRATION_PALETTE.lungInner} />
          <stop offset="100%" stopColor={RESPIRATION_PALETTE.lungTissue} />
        </linearGradient>
        <linearGradient id="thorax-diaphragm-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor={RESPIRATION_PALETTE.diaphragm} />
        </linearGradient>
        <linearGradient id="thorax-cavity-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.4" />
        </linearGradient>
        <filter id="thorax-select-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#0284C7" floodOpacity="0.7" />
        </filter>
      </defs>

      {/* Subtle torso & head/neck silhouette */}
      <g id="layer-silhouette" pointerEvents="none">
        {/* Head & Neck profile */}
        <path
          d="M 188 18 C 216 10, 266 14, 274 44 C 278 62, 272 80, 262 92 L 262 122 C 304 134, 366 156, 378 214 L 382 426 L 78 426 L 82 214 C 94 156, 156 134, 198 122 L 198 96 C 186 96, 180 90, 182 82 L 176 76 C 172 72, 174 66, 180 62 L 172 56 C 166 52, 174 42, 184 34 C 185 26, 186 21, 188 18 Z"
          fill="url(#thorax-body-bg)"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        {/* Subtle abdominal region below diaphragm */}
        <path
          d={`M ${g.diaLeftX + 2} ${g.diaEdgeY + 12} Q ${CX} ${g.diaCtrlY + 15} ${g.diaRightX - 2} ${g.diaEdgeY + 12} L ${g.diaRightX - 4} 424 L ${g.diaLeftX + 4} 424 Z`}
          fill="#F1F5F9"
          opacity="0.7"
        />
      </g>

      {/* 1. Thoracic Cavity Layer */}
      <g
        id="layer-thoracic-cavity"
        filter={isSelected('thoracic_cavity') ? 'url(#thorax-select-glow)' : undefined}
      >
        <path
          d={cavityPath}
          fill={isSelected('thoracic_cavity') ? '#BAE6FD' : 'url(#thorax-cavity-grad)'}
          stroke={isSelected('thoracic_cavity') ? '#0284C7' : '#7DD3FC'}
          strokeWidth={isSelected('thoracic_cavity') ? 3 : 1.8}
          strokeDasharray={isSelected('thoracic_cavity') ? undefined : '5 3'}
        />
        {isSelected('thoracic_cavity') && (
          <text
            x={CX}
            y={g.diaTopY - 6}
            textAnchor="middle"
            fill="#0369A1"
            fontSize="11"
            fontWeight="800"
          >
            흉강 (Pleural Cavity)
          </text>
        )}
      </g>

      {/* 2. Nasal Cavity Layer */}
      <g
        id="layer-nasal"
        className="svg-organ-node"
        role="button"
        tabIndex={0}
        aria-label="코 (비강)"
        onClick={() => handleOrganClick('nasal')}
        onKeyDown={(e) => handleOrganKeyDown(e, 'nasal')}
        filter={isSelected('nasal') ? 'url(#thorax-select-glow)' : undefined}
      >
        <path
          d="M 178 52 C 188 42, 206 38, 224 44 C 234 48, 240 58, 238 72 L 238 94 L 222 94 L 222 72 C 212 68, 196 68, 184 62 Z"
          fill={isSelected('nasal') ? '#7DD3FC' : '#FBCFE8'}
          stroke={isSelected('nasal') ? '#0284C7' : '#DB2777'}
          strokeWidth={isSelected('nasal') ? 2.6 : 1.6}
        />
        {/* Nasal conchae ridges */}
        <path
          d="M 190 52 Q 208 48 222 54 M 192 59 Q 208 56 220 61"
          fill="none"
          stroke={isSelected('nasal') ? '#0369A1' : '#BE185D'}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>

      {/* 3. Trachea Layer */}
      <g
        id="layer-trachea"
        className="svg-organ-node"
        role="button"
        tabIndex={0}
        aria-label="기관"
        onClick={() => handleOrganClick('trachea')}
        onKeyDown={(e) => handleOrganKeyDown(e, 'trachea')}
        filter={isSelected('trachea') ? 'url(#thorax-select-glow)' : undefined}
      >
        <rect
          x={CX - 10}
          y={92}
          width={20}
          height={96}
          rx={5}
          fill={isSelected('trachea') ? '#BAE6FD' : '#FFE4E6'}
          stroke={isSelected('trachea') ? '#0284C7' : '#E11D48'}
          strokeWidth={isSelected('trachea') ? 2.5 : 1.5}
        />
        {/* C-shaped cartilage rings */}
        {[100, 112, 124, 136, 148, 160, 172].map((ry) => (
          <rect
            key={ry}
            x={CX - 12}
            y={ry}
            width={24}
            height={5}
            rx={2.5}
            fill={isSelected('trachea') ? '#38BDF8' : RESPIRATION_PALETTE.cartilage}
            stroke="#475569"
            strokeWidth="0.9"
          />
        ))}
      </g>

      {/* 4. Lungs Layer */}
      <g
        id="layer-lungs"
        className="svg-organ-node"
        role="button"
        tabIndex={0}
        aria-label="폐"
        onClick={() => handleOrganClick('lungs')}
        onKeyDown={(e) => handleOrganKeyDown(e, 'lungs')}
        filter={isSelected('lungs') ? 'url(#thorax-select-glow)' : undefined}
      >
        <path
          d={leftLungPath}
          fill="url(#thorax-lung-grad)"
          fillOpacity="0.92"
          stroke={isSelected('lungs') ? '#0284C7' : '#E11D48'}
          strokeWidth={isSelected('lungs') ? 3 : 1.8}
        />
        <path
          d={rightLungPath}
          fill="url(#thorax-lung-grad)"
          fillOpacity="0.92"
          stroke={isSelected('lungs') ? '#0284C7' : '#E11D48'}
          strokeWidth={isSelected('lungs') ? 3 : 1.8}
        />
        {/* Subtle lobe fissure lines */}
        <path
          d={`M ${leftOuterX + 10} ${g.lungTopY + 62} Q ${leftMidX} ${g.lungTopY + 78} ${leftInnerX - 6} ${g.lungTopY + 86}`}
          fill="none"
          stroke="#FB7185"
          strokeWidth="1.2"
          strokeOpacity="0.65"
        />
        <path
          d={`M ${rightOuterX - 10} ${g.lungTopY + 68} Q ${rightMidX} ${g.lungTopY + 84} ${rightInnerX + 10} ${g.lungTopY + 94}`}
          fill="none"
          stroke="#FB7185"
          strokeWidth="1.2"
          strokeOpacity="0.65"
        />
      </g>

      {/* 5. Bronchi Layer */}
      <g
        id="layer-bronchi"
        className="svg-organ-node"
        role="button"
        tabIndex={0}
        aria-label="기관지"
        onClick={() => handleOrganClick('bronchi')}
        onKeyDown={(e) => handleOrganKeyDown(e, 'bronchi')}
        transform={`translate(${CX}, 186) scale(${bronchiScaleX}, ${bronchiScaleY}) translate(${-CX}, -186)`}
        filter={isSelected('bronchi') ? 'url(#thorax-select-glow)' : undefined}
      >
        {/* Main left & right primary bronchi + secondary branches */}
        <path
          d={`M ${CX} 184 L ${CX - 42} 214 M ${CX - 42} 214 L ${CX - 68} 204 M ${CX - 42} 214 L ${CX - 66} 238 M ${CX - 54} 226 L ${CX - 42} 252`}
          fill="none"
          stroke={isSelected('bronchi') ? '#0284C7' : '#BE123C'}
          strokeWidth={isSelected('bronchi') ? 5.5 : 4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${CX} 184 L ${CX + 42} 214 M ${CX + 42} 214 L ${CX + 68} 204 M ${CX + 42} 214 L ${CX + 66} 238 M ${CX + 54} 226 L ${CX + 42} 252`}
          fill="none"
          stroke={isSelected('bronchi') ? '#0284C7' : '#BE123C'}
          strokeWidth={isSelected('bronchi') ? 5.5 : 4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner airway lumen highlight */}
        <path
          d={`M ${CX} 184 L ${CX - 42} 214 L ${CX - 66} 238 M ${CX} 184 L ${CX + 42} 214 L ${CX + 66} 238`}
          fill="none"
          stroke="#FFE4E6"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>

      {/* 6. Alveoli Layer (clickable grape-cluster node inside right lung) */}
      <g
        id="layer-alveoli"
        className="svg-organ-node"
        role="button"
        tabIndex={0}
        aria-label="폐포"
        onClick={() => handleOrganClick('alveoli')}
        onKeyDown={(e) => handleOrganKeyDown(e, 'alveoli')}
        filter={isSelected('alveoli') ? 'url(#thorax-select-glow)' : undefined}
      >
        <circle
          cx={alveoliCx}
          cy={alveoliCy}
          r={18}
          fill="#FFF1F2"
          fillOpacity="0.92"
          stroke={isSelected('alveoli') ? '#0284C7' : '#E11D48'}
          strokeWidth={isSelected('alveoli') ? 2.6 : 1.5}
          strokeDasharray={isSelected('alveoli') ? undefined : '3 2'}
        />
        {[
          { dx: -5, dy: -4, r: 4.4 },
          { dx: 4, dy: -5, r: 4.2 },
          { dx: -6, dy: 4, r: 4.2 },
          { dx: 3, dy: 4, r: 4.5 },
          { dx: 0, dy: 0, r: 4.5 },
        ].map((dot, idx) => (
          <circle
            key={idx}
            cx={alveoliCx + dot.dx}
            cy={alveoliCy + dot.dy}
            r={dot.r}
            fill="#FECDD3"
            stroke="#BE123C"
            strokeWidth="1"
          />
        ))}
      </g>

      {/* 7. Ribcage Layer (optional via showRibs, rotates smoothly upward & outward) */}
      <g
        id="layer-ribcage"
        pointerEvents="none"
        opacity={showRibs ? 1 : 0}
        filter={isSelected('ribcage') ? 'url(#thorax-select-glow)' : undefined}
      >
        {showRibs && (
          <>
            {/* Central sternum */}
            <rect
              x={CX - 5}
              y={148 + g.sternumShiftY}
              width={10}
              height={136}
              rx={5}
              fill={isSelected('ribcage') ? '#E0F2FE' : RESPIRATION_PALETTE.ribBone}
              stroke={isSelected('ribcage') ? '#0284C7' : '#64748B'}
              strokeWidth={isSelected('ribcage') ? 2 : 1.2}
              opacity="0.88"
            />
            {ribRatios.map((ratio, i) => {
              const pivotY = 164 + i * 23 + g.sternumShiftY;
              const reachX = (g.cavHalfW + 4) * ratio;
              const tipY = pivotY + g.ribDropY;
              const ctrlY = pivotY - 6 + g.ribDropY * 0.25;

              const leftRib = `M ${CX - 6} ${pivotY} Q ${CX - reachX * 0.62} ${ctrlY} ${CX - reachX} ${tipY}`;
              const rightRib = `M ${CX + 6} ${pivotY} Q ${CX + reachX * 0.62} ${ctrlY} ${CX + reachX} ${tipY}`;

              const ribStroke = isSelected('ribcage')
                ? '#0284C7'
                : RESPIRATION_PALETTE.ribBone;
              const ribOutline = isSelected('ribcage') ? '#0369A1' : '#64748B';

              return (
                <g key={i} opacity="0.82">
                  <path
                    d={leftRib}
                    fill="none"
                    stroke={ribOutline}
                    strokeWidth="7.5"
                    strokeLinecap="round"
                  />
                  <path
                    d={leftRib}
                    fill="none"
                    stroke={ribStroke}
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <path
                    d={rightRib}
                    fill="none"
                    stroke={ribOutline}
                    strokeWidth="7.5"
                    strokeLinecap="round"
                  />
                  <path
                    d={rightRib}
                    fill="none"
                    stroke={ribStroke}
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Rib motion arrow cues */}
            {(isInhaling || isExhaling) && (
              <g>
                <text
                  x={CX - g.cavHalfW - 14}
                  y={212}
                  textAnchor="middle"
                  fill={isInhaling ? RESPIRATION_PALETTE.inhale : RESPIRATION_PALETTE.exhale}
                  fontSize="14"
                  fontWeight="900"
                >
                  {isInhaling ? '▲' : '▼'}
                </text>
                <text
                  x={CX + g.cavHalfW + 14}
                  y={212}
                  textAnchor="middle"
                  fill={isInhaling ? RESPIRATION_PALETTE.inhale : RESPIRATION_PALETTE.exhale}
                  fontSize="14"
                  fontWeight="900"
                >
                  {isInhaling ? '▲' : '▼'}
                </text>
              </g>
            )}
          </>
        )}
      </g>

      {/* 8. Diaphragm Layer (strictly below lungBottomY - 6 at all phases) */}
      <g
        id="layer-diaphragm"
        filter={isSelected('diaphragm') ? 'url(#thorax-select-glow)' : undefined}
      >
        <path
          d={diaphragmBandPath}
          fill={isSelected('diaphragm') ? '#0284C7' : 'url(#thorax-diaphragm-grad)'}
          stroke={isSelected('diaphragm') ? '#0369A1' : '#9F1239'}
          strokeWidth={isSelected('diaphragm') ? 2.6 : 1.6}
        />
        {/* Tendinous center highlight */}
        <path
          d={`M ${CX - 34} ${g.diaTopY + 5} Q ${CX} ${g.diaTopY + 2} ${CX + 34} ${g.diaTopY + 5}`}
          fill="none"
          stroke="#FFE4E6"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        {(isInhaling || isExhaling) && (
          <text
            x={CX}
            y={g.diaTopY + 32}
            textAnchor="middle"
            fill={isInhaling ? RESPIRATION_PALETTE.inhale : RESPIRATION_PALETTE.exhale}
            fontSize="13"
            fontWeight="900"
          >
            {isInhaling ? '▼ 하강' : '▲ 상승'}
          </text>
        )}
      </g>

      {/* Callout Labels & Blind Mode Badges */}
      {showLabels && (
        <g id="layer-labels">
          {labels.map((item) => {
            const isHidden = blindMode && !revealedLabels[item.key];
            const isItemSelected = selectedTarget === item.key;
            const lineStartX =
              item.side === 'left' ? item.pillX + item.pillW : item.pillX;
            const lineStartY = item.pillY + 12;

            return (
              <g key={item.key}>
                <line
                  x1={lineStartX}
                  y1={lineStartY}
                  x2={item.targetX}
                  y2={item.targetY}
                  stroke={isItemSelected ? '#0284C7' : '#64748B'}
                  strokeWidth={isItemSelected ? 2 : 1.3}
                  strokeDasharray={isHidden ? '3 2' : undefined}
                />
                <circle
                  cx={item.targetX}
                  cy={item.targetY}
                  r={3}
                  fill={isItemSelected ? '#0284C7' : '#475569'}
                />

                {isHidden ? (
                  <g
                    className="svg-organ-node"
                    role="button"
                    tabIndex={0}
                    aria-label="숨겨진 기관 이름 확인"
                    onClick={() => onRevealLabel?.(item.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRevealLabel?.(item.key);
                      }
                    }}
                  >
                    <rect
                      x={item.pillX}
                      y={item.pillY}
                      width={item.pillW}
                      height={24}
                      rx={12}
                      fill="#1E293B"
                      stroke="#FACC15"
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                    <text
                      x={item.pillX + item.pillW / 2}
                      y={item.pillY + 16}
                      textAnchor="middle"
                      fill="#FDE047"
                      fontSize="12"
                      fontWeight="800"
                    >
                      ?
                    </text>
                  </g>
                ) : (
                  <g
                    className={item.organId ? 'svg-organ-node' : undefined}
                    role={item.organId ? 'button' : undefined}
                    tabIndex={item.organId ? 0 : undefined}
                    onClick={
                      item.organId ? () => handleOrganClick(item.organId!) : undefined
                    }
                    onKeyDown={
                      item.organId
                        ? (e) => handleOrganKeyDown(e, item.organId!)
                        : undefined
                    }
                  >
                    <rect
                      x={item.pillX}
                      y={item.pillY}
                      width={item.pillW}
                      height={24}
                      rx={12}
                      fill={
                        isItemSelected
                          ? '#0284C7'
                          : blindMode
                          ? '#D1FAE5'
                          : '#FFFFFF'
                      }
                      stroke={
                        isItemSelected
                          ? '#0369A1'
                          : blindMode
                          ? '#34D399'
                          : '#94A3B8'
                      }
                      strokeWidth={isItemSelected ? 2 : 1.2}
                    />
                    <text
                      x={item.pillX + item.pillW / 2}
                      y={item.pillY + 16}
                      textAnchor="middle"
                      fill={
                        isItemSelected
                          ? '#FFFFFF'
                          : blindMode
                          ? '#065F46'
                          : '#0F172A'
                      }
                      fontSize="11.5"
                      fontWeight="700"
                    >
                      {item.text}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
};
