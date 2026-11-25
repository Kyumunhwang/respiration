import React from 'react';
import { GalleryAssetId } from '../../types/respiration';
import { RESPIRATION_PALETTE } from '../../styles/palette';

export interface OrganGallerySvgProps {
  assetId: GalleryAssetId;
  className?: string;
}

const NasalCiliaIllustration: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="og-nasal-air" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={RESPIRATION_PALETTE.inhaleLight} />
        <stop offset="100%" stopColor="#F0F9FF" />
      </linearGradient>
      <linearGradient id="og-nasal-mucus" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.35" />
      </linearGradient>
      <linearGradient id="og-nasal-submucosa" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFE4E6" />
        <stop offset="100%" stopColor="#FECDD3" />
      </linearGradient>
      <marker
        id="og-nasal-arrow-inhale"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M0,1 L9,5 L0,9 Z" fill={RESPIRATION_PALETTE.inhale} />
      </marker>
      <marker
        id="og-nasal-arrow-sweep"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto"
      >
        <path d="M0,1 L9,5 L0,9 Z" fill="#0369A1" />
      </marker>
    </defs>

    {/* Air passage background */}
    <rect x="0" y="0" width="420" height="260" rx="10" fill="url(#og-nasal-air)" />

    {/* Submucosa & capillary bed background */}
    <rect x="0" y="168" width="420" height="92" fill="url(#og-nasal-submucosa)" />
    <line x1="0" y1="168" x2="420" y2="168" stroke="#FB7185" strokeWidth="1.5" />

    {/* Warm capillary bed loops */}
    <path
      d="M 18 228 C 48 182, 82 182, 112 224 C 142 252, 178 180, 212 218 C 246 250, 278 182, 314 218 C 348 250, 380 184, 408 220"
      fill="none"
      stroke={RESPIRATION_PALETTE.arterialRed}
      strokeWidth="7"
      strokeLinecap="round"
    />
    <path
      d="M 18 228 C 48 182, 82 182, 112 224 C 142 252, 178 180, 212 218 C 246 250, 278 182, 314 218 C 348 250, 380 184, 408 220"
      fill="none"
      stroke="#FCA5A5"
      strokeWidth="2"
      strokeDasharray="6 8"
      strokeLinecap="round"
    />
    <path
      d="M 32 246 C 72 204, 128 248, 168 202 C 208 242, 260 198, 304 242 C 348 206, 382 244, 412 232"
      fill="none"
      stroke={RESPIRATION_PALETTE.venousDark}
      strokeWidth="4.5"
      strokeOpacity="0.72"
      strokeLinecap="round"
    />

    {/* Epithelial cells + goblet cells */}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((idx) => {
      const x = 14 + idx * 33;
      const isGoblet = idx === 3 || idx === 8;
      if (isGoblet) {
        return (
          <g key={idx}>
            <path
              d={`M ${x + 4} 168 L ${x + 2} 134 C ${x} 118, ${x + 8} 112, ${x + 15} 112 C ${x + 22} 112, ${x + 30} 118, ${x + 28} 134 L ${x + 26} 168 Z`}
              fill="#A5F3FC"
              stroke="#0891B2"
              strokeWidth="1.5"
            />
            {/* Mucus granules inside goblet cell */}
            <circle cx={x + 12} cy={128} r="3" fill="#22D3EE" />
            <circle cx={x + 19} cy={125} r="2.6" fill="#22D3EE" />
            <circle cx={x + 15} cy={136} r="3.2" fill="#06B6D4" />
            <ellipse cx={x + 15} cy={156} rx="5" ry="6" fill="#155E75" opacity="0.75" />
          </g>
        );
      }
      return (
        <g key={idx}>
          <rect
            x={x + 1}
            y={114}
            width="30"
            height="54"
            rx="4"
            fill="#FBCFE8"
            stroke="#DB2777"
            strokeWidth="1.2"
          />
          <ellipse cx={x + 16} cy={150} rx="5.5" ry="7.5" fill="#9D174D" opacity="0.8" />
          {/* Cilia tufts */}
          {[-9, -3, 3, 9].map((dx) => (
            <path
              key={dx}
              d={`M ${x + 16 + dx} 114 Q ${x + 13 + dx} 102 ${x + 10 + dx} 94`}
              fill="none"
              stroke="#BE185D"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    })}

    {/* Mucus blanket */}
    <path
      d="M 8 82 Q 70 76 130 82 T 260 80 T 412 83 L 412 102 Q 280 99 180 103 T 8 100 Z"
      fill="url(#og-nasal-mucus)"
      stroke="#0891B2"
      strokeWidth="1"
      strokeOpacity="0.45"
    />

    {/* Trapped dust & bacteria particles */}
    <g>
      <circle cx="96" cy="90" r="4.5" fill="#78350F" />
      <circle cx="176" cy="88" r="3.5" fill="#451A03" />
      <ellipse cx="256" cy="91" rx="6" ry="3.2" fill="#15803D" />
      <circle cx="332" cy="87" r="4" fill="#78350F" />
    </g>

    {/* Cold air entering -> warmed & humidified */}
    <path
      d="M 24 44 L 155 44"
      fill="none"
      stroke={RESPIRATION_PALETTE.inhale}
      strokeWidth="3"
      strokeDasharray="6 4"
      markerEnd="url(#og-nasal-arrow-inhale)"
    />
    <path
      d="M 245 44 L 386 44"
      fill="none"
      stroke={RESPIRATION_PALETTE.arterialRed}
      strokeWidth="2.6"
      strokeDasharray="6 4"
      markerEnd="url(#og-nasal-arrow-sweep)"
    />

    {/* Heat / humidity rising from capillary bed */}
    {[88, 200, 315].map((hx) => (
      <path
        key={hx}
        d={`M ${hx} 190 Q ${hx - 5} 178 ${hx} 166 Q ${hx + 5} 154 ${hx} 142`}
        fill="none"
        stroke="#EF4444"
        strokeWidth="1.6"
        strokeDasharray="3 3"
        opacity="0.7"
      />
    ))}

    {/* Cilia sweeping direction arrow */}
    <path
      d="M 218 70 L 146 70"
      fill="none"
      stroke="#0369A1"
      strokeWidth="2"
      markerEnd="url(#og-nasal-arrow-sweep)"
    />

    {/* Labels */}
    <rect x="12" y="10" width="152" height="24" rx="6" fill="#0F172A" opacity="0.86" />
    <text x="88" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="700">
      비강 점막 · 섬모 · 모세혈관 단면
    </text>

    <text x="86" y="61" textAnchor="middle" fill="#0369A1" fontSize="10.5" fontWeight="700">
      외부 공기 유입
    </text>
    <text x="315" y="61" textAnchor="middle" fill="#B91C1C" fontSize="10.5" fontWeight="700">
      체온·습도 조절된 공기
    </text>
    <text x="182" y="66" textAnchor="middle" fill="#0369A1" fontSize="9.5" fontWeight="700">
      섬모 배출 방향
    </text>

    {/* Mucus & goblet callouts */}
    <rect x="268" y="68" width="138" height="20" rx="4" fill="#FFFFFF" fillOpacity="0.9" stroke="#0891B2" />
    <text x="337" y="81.5" textAnchor="middle" fill="#0E7490" fontSize="10" fontWeight="700">
      점액층 (먼지·세균 흡착)
    </text>

    <rect x="86" y="176" width="108" height="20" rx="4" fill="#FFFFFF" fillOpacity="0.92" stroke="#DB2777" />
    <text x="140" y="189.5" textAnchor="middle" fill="#9D174D" fontSize="10" fontWeight="700">
      점액 분비 세포
    </text>
    <line x1="128" y1="176" x2="128" y2="156" stroke="#9D174D" strokeWidth="1.2" />

    <rect x="234" y="232" width="174" height="21" rx="4" fill="#FFFFFF" fillOpacity="0.94" stroke="#EF4444" />
    <text x="321" y="246" textAnchor="middle" fill="#991B1B" fontSize="10" fontWeight="700">
      모세혈관 망 (온도·습도 조절)
    </text>
  </g>
);

const TracheaCartilageIllustration: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="og-trachea-wall" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FDA4AF" />
        <stop offset="50%" stopColor="#FECDD3" />
        <stop offset="100%" stopColor="#FB7185" />
      </linearGradient>
      <linearGradient id="og-trachea-lumen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#9F1239" />
        <stop offset="45%" stopColor="#BE123C" />
        <stop offset="100%" stopColor="#881337" />
      </linearGradient>
      <linearGradient id="og-trachea-ring" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E2E8F0" />
        <stop offset="55%" stopColor={RESPIRATION_PALETTE.cartilage} />
        <stop offset="100%" stopColor="#64748B" />
      </linearGradient>
      <marker
        id="og-trachea-up"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="5.5"
        markerHeight="5.5"
        orient="auto"
      >
        <path d="M0,1 L9,5 L0,9 Z" fill="#0369A1" />
      </marker>
    </defs>

    <rect x="0" y="0" width="420" height="260" rx="10" fill={RESPIRATION_PALETTE.thoraxBg} />

    {/* Title pill */}
    <rect x="12" y="10" width="184" height="24" rx="6" fill="#0F172A" />
    <text x="104" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="700">
      기관 연골 고리 &amp; 섬모 상피 확대
    </text>

    {/* Left: Trachea cutaway cylinder */}
    <g transform="translate(26, 44)">
      {/* Outer tracheal wall */}
      <rect x="30" y="10" width="94" height="178" rx="12" fill="url(#og-trachea-wall)" stroke="#E11D48" strokeWidth="1.6" />
      {/* Cutaway inner lumen */}
      <rect x="56" y="14" width="44" height="170" rx="6" fill="url(#og-trachea-lumen)" />

      {/* C-shaped Hyaline Cartilage Rings */}
      {[20, 50, 80, 110, 140].map((ry) => (
        <g key={ry}>
          <path
            d={`M 24 ${ry} C 24 ${ry - 10}, 56 ${ry - 12}, 62 ${ry - 4} L 62 ${ry + 14} C 56 ${ry + 8}, 24 ${ry + 10}, 24 ${ry + 16} Z`}
            fill="url(#og-trachea-ring)"
            stroke="#475569"
            strokeWidth="1.2"
          />
          <path
            d={`M 130 ${ry} C 130 ${ry - 10}, 98 ${ry - 12}, 92 ${ry - 4} L 92 ${ry + 14} C 98 ${ry + 8}, 130 ${ry + 10}, 130 ${ry + 16} Z`}
            fill="url(#og-trachea-ring)"
            stroke="#475569"
            strokeWidth="1.2"
          />
          {/* Front arch connecting C-ring */}
          <path
            d={`M 24 ${ry + 8} Q 77 ${ry + 22} 130 ${ry + 8}`}
            fill="none"
            stroke="url(#og-trachea-ring)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d={`M 27 ${ry + 6} Q 77 ${ry + 19} 127 ${ry + 6}`}
            fill="none"
            stroke="#F8FAFC"
            strokeWidth="2"
            strokeOpacity="0.65"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Air passage center arrow */}
      <path
        d="M 78 24 L 78 168"
        fill="none"
        stroke={RESPIRATION_PALETTE.inhaleLight}
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />

      {/* Top horseshoe cross-section preview */}
      <g transform="translate(46, -6)">
        <path
          d="M 8 10 A 24 11 0 1 1 54 10"
          fill="none"
          stroke="#64748B"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 8 10 A 24 11 0 1 1 54 10"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Label for cartilage ring */}
      <rect x="-12" y="188" width="176" height="22" rx="5" fill="#FFFFFF" stroke="#64748B" />
      <text x="76" y="203" textAnchor="middle" fill="#1E293B" fontSize="10" fontWeight="700">
        말굽(C자) 연골 고리 (기도 유지)
      </text>
    </g>

    {/* Zoom callout lines */}
    <line x1="126" y1="110" x2="210" y2="54" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="4 3" />
    <line x1="126" y1="138" x2="210" y2="232" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="4 3" />
    <rect x="116" y="108" width="12" height="32" rx="2" fill="none" stroke="#0284C7" strokeWidth="1.8" />

    {/* Right: Magnified ciliated epithelial wall */}
    <g transform="translate(206, 36)">
      <rect x="0" y="0" width="202" height="206" rx="12" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
      <rect x="12" y="8" width="178" height="22" rx="5" fill="#E0F2FE" />
      <text x="101" y="23" textAnchor="middle" fill="#0369A1" fontSize="10.5" fontWeight="700">
        안쪽 벽 확대: 섬모 운동
      </text>

      {/* Epithelial cells on right wall pushing upward */}
      {[0, 1, 2, 3, 4].map((idx) => {
        const y = 42 + idx * 30;
        const isGoblet = idx === 2;
        if (isGoblet) {
          return (
            <g key={idx}>
              <path
                d={`M 188 ${y + 2} L 146 ${y + 5} C 136 ${y + 7}, 136 ${y + 21}, 146 ${y + 23} L 188 ${y + 26} Z`}
                fill="#A5F3FC"
                stroke="#0891B2"
                strokeWidth="1.4"
              />
              <circle cx="152" cy={y + 14} r="3" fill="#06B6D4" />
              <circle cx="164" cy={y + 14} r="2.5" fill="#06B6D4" />
            </g>
          );
        }
        return (
          <g key={idx}>
            <rect x="138" y={y + 1} width="50" height="27" rx="4" fill="#FBCFE8" stroke="#DB2777" strokeWidth="1.2" />
            <ellipse cx="170" cy={y + 14} rx="7" ry="4.5" fill="#9D174D" opacity="0.8" />
            {[-7, 0, 7].map((dy) => (
              <path
                key={dy}
                d={`M 138 ${y + 14 + dy} Q 124 ${y + 11 + dy} 116 ${y + 7 + dy}`}
                fill="none"
                stroke="#BE185D"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ))}
          </g>
        );
      })}

      {/* Mucus layer flowing upward */}
      <path
        d="M 96 42 Q 90 95 96 145 T 95 190 L 114 190 Q 116 140 114 90 T 114 42 Z"
        fill="#67E8F9"
        fillOpacity="0.55"
        stroke="#0891B2"
        strokeWidth="1"
      />

      {/* Trapped particles pushed upward */}
      <circle cx="104" cy="162" r="4" fill="#78350F" />
      <circle cx="106" cy="122" r="3.5" fill="#451A03" />
      <ellipse cx="103" cy="80" rx="4" ry="5.5" fill="#15803D" />

      {/* Upward sweeping arrows */}
      <path
        d="M 68 174 L 68 58"
        fill="none"
        stroke="#0369A1"
        strokeWidth="3"
        markerEnd="url(#og-trachea-up)"
      />
      <text x="38" y="106" textAnchor="middle" fill="#0369A1" fontSize="10" fontWeight="700">
        이물질
      </text>
      <text x="38" y="121" textAnchor="middle" fill="#0369A1" fontSize="10" fontWeight="700">
        위쪽 배출
      </text>
      <text x="38" y="136" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="600">
        (가래로 나옴)
      </text>

      <text x="102" y="201" textAnchor="middle" fill="#475569" fontSize="9.5" fontWeight="600">
        점액이 먼지 흡착 · 섬모가 쓸어 올림
      </text>
    </g>
  </g>
);

const AlveoliCapillariesIllustration: React.FC = () => (
  <g>
    <defs>
      <radialGradient id="og-alv-sac" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FFF1F2" />
        <stop offset="60%" stopColor={RESPIRATION_PALETTE.lungInner} />
        <stop offset="100%" stopColor={RESPIRATION_PALETTE.lungTissue} />
      </radialGradient>
      <linearGradient id="og-cap-transition" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={RESPIRATION_PALETTE.venousDark} />
        <stop offset="50%" stopColor="#B91C1C" />
        <stop offset="100%" stopColor={RESPIRATION_PALETTE.arterialRed} />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="420" height="260" rx="10" fill="#F8FAFC" />

    {/* Bronchiole entering from top-left */}
    <path
      d="M 24 58 C 68 62, 108 74, 146 96 L 166 112"
      fill="none"
      stroke="#FDA4AF"
      strokeWidth="24"
      strokeLinecap="round"
    />
    <path
      d="M 24 58 C 68 62, 108 74, 146 96 L 166 112"
      fill="none"
      stroke="#FFE4E6"
      strokeWidth="15"
      strokeLinecap="round"
    />
    {/* Branching alveolar ducts */}
    <path d="M 148 98 L 222 72" stroke="#FDA4AF" strokeWidth="14" strokeLinecap="round" />
    <path d="M 152 104 L 194 166" stroke="#FDA4AF" strokeWidth="14" strokeLinecap="round" />
    <path d="M 158 102 L 268 124" stroke="#FDA4AF" strokeWidth="14" strokeLinecap="round" />

    {/* Grape-like cluster of alveoli */}
    {[
      { cx: 222, cy: 56, r: 24 },
      { cx: 256, cy: 62, r: 23 },
      { cx: 204, cy: 84, r: 22 },
      { cx: 244, cy: 92, r: 25 },
      { cx: 282, cy: 88, r: 24 },
      { cx: 274, cy: 124, r: 26 },
      { cx: 310, cy: 114, r: 23 },
      { cx: 236, cy: 130, r: 24 },
      { cx: 184, cy: 156, r: 23 },
      { cx: 218, cy: 168, r: 25 },
      { cx: 254, cy: 168, r: 24 },
      { cx: 292, cy: 158, r: 23 },
      { cx: 202, cy: 196, r: 22 },
      { cx: 238, cy: 198, r: 22 },
    ].map((a, i) => (
      <circle
        key={i}
        cx={a.cx}
        cy={a.cy}
        r={a.r}
        fill="url(#og-alv-sac)"
        stroke="#FB7185"
        strokeWidth="1.6"
      />
    ))}

    {/* Pulmonary capillary network wrapping tightly around alveolar cluster */}
    {/* Venous inflow (dark red) from top-left */}
    <path
      d="M 24 34 C 90 32, 152 46, 200 58 C 228 66, 250 56, 276 74"
      fill="none"
      stroke={RESPIRATION_PALETTE.venousDark}
      strokeWidth="6.5"
      strokeLinecap="round"
    />
    {/* Dense capillary mesh across alveoli */}
    <path
      d="M 192 58 C 218 76, 240 60, 276 82 C 304 100, 260 120, 294 140 C 316 154, 270 182, 232 178 C 198 174, 180 144, 212 126 C 242 110, 224 88, 254 88"
      fill="none"
      stroke="url(#og-cap-transition)"
      strokeWidth="3.8"
      strokeLinecap="round"
    />
    <path
      d="M 206 72 C 186 104, 236 112, 208 148 C 188 176, 222 204, 256 196 C 284 188, 308 160, 326 178"
      fill="none"
      stroke="url(#og-cap-transition)"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <path
      d="M 242 54 C 272 68, 296 98, 264 128 C 242 148, 276 168, 308 158"
      fill="none"
      stroke="url(#og-cap-transition)"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    {/* Arterial outflow (bright red) to bottom-right */}
    <path
      d="M 246 196 C 292 198, 336 202, 396 204"
      fill="none"
      stroke={RESPIRATION_PALETTE.arterialRed}
      strokeWidth="7"
      strokeLinecap="round"
    />

    {/* Labels */}
    <rect x="12" y="10" width="186" height="24" rx="6" fill="#0F172A" />
    <text x="105" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="700">
      폐포 다발 &amp; 모세혈관 그물망
    </text>

    <rect x="12" y="92" width="114" height="22" rx="5" fill="#FFFFFF" stroke="#FB7185" />
    <text x="69" y="107" textAnchor="middle" fill="#9F1239" fontSize="10" fontWeight="700">
      세기관지 (공기 통로)
    </text>
    <line x1="88" y1="92" x2="104" y2="78" stroke="#FB7185" strokeWidth="1.3" />

    <rect x="292" y="34" width="116" height="22" rx="5" fill="#FFFFFF" stroke={RESPIRATION_PALETTE.venousDark} />
    <text x="350" y="49" textAnchor="middle" fill={RESPIRATION_PALETTE.venousDark} fontSize="10" fontWeight="700">
      정맥혈 (O₂↓, CO₂↑)
    </text>
    <line x1="292" y1="46" x2="246" y2="54" stroke={RESPIRATION_PALETTE.venousDark} strokeWidth="1.2" />

    <rect x="288" y="220" width="120" height="22" rx="5" fill="#FFFFFF" stroke={RESPIRATION_PALETTE.arterialRed} />
    <text x="348" y="235" textAnchor="middle" fill="#B91C1C" fontSize="10" fontWeight="700">
      동맥혈 (O₂↑, CO₂↓)
    </text>
    <line x1="348" y1="220" x2="348" y2="206" stroke={RESPIRATION_PALETTE.arterialRed} strokeWidth="1.2" />

    <rect x="12" y="220" width="194" height="28" rx="6" fill="#EFF6FF" stroke="#0284C7" />
    <text x="109" y="238" textAnchor="middle" fill="#0369A1" fontSize="10.5" fontWeight="700">
      수억 개 폐포 → 기체 교환 표면적 극대화
    </text>
  </g>
);

const AlveoliDiffusionIllustration: React.FC = () => (
  <g>
    <defs>
      <radialGradient id="og-diff-alv" cx="45%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#FFE4E6" />
      </radialGradient>
      <linearGradient id="og-diff-blood" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FCE7F3" />
        <stop offset="50%" stopColor="#FEE2E2" />
        <stop offset="100%" stopColor="#FECACA" />
      </linearGradient>
      <marker
        id="og-diff-o2"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="5.5"
        markerHeight="5.5"
        orient="auto"
      >
        <path d="M0,1 L9,5 L0,9 Z" fill={RESPIRATION_PALETTE.inhale} />
      </marker>
      <marker
        id="og-diff-co2"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="5.5"
        markerHeight="5.5"
        orient="auto"
      >
        <path d="M0,1 L9,5 L0,9 Z" fill={RESPIRATION_PALETTE.exhale} />
      </marker>
    </defs>

    <rect x="0" y="0" width="420" height="260" rx="10" fill="#F8FAFC" />

    {/* Single Alveolus cross-section (top-left/center dome) */}
    <path
      d="M 48 164 C 36 86, 108 32, 206 32 C 304 32, 376 86, 364 164 L 348 164 C 356 96, 294 48, 206 48 C 118 48, 56 96, 64 164 Z"
      fill="#FDA4AF"
      stroke="#E11D48"
      strokeWidth="1.5"
    />
    {/* Alveolus interior air space */}
    <path
      d="M 64 164 C 56 96, 118 48, 206 48 C 294 48, 356 96, 348 164 Z"
      fill="url(#og-diff-alv)"
    />

    {/* Bottom alveolar squamous epithelium (1-cell thick!) */}
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const x = 66 + i * 47;
      return (
        <g key={`alv-cell-${i}`}>
          <rect
            x={x}
            y={156}
            width="45"
            height="10"
            rx="5"
            fill="#FECDD3"
            stroke="#E11D48"
            strokeWidth="1.2"
          />
          <ellipse cx={x + 22} cy={161} rx="6" ry="2.4" fill="#9F1239" />
        </g>
      );
    })}

    {/* Thin basement membrane gap (y = 166..172) */}
    <rect x="52" y="166" width="316" height="6" fill="#FEF3C7" />

    {/* Capillary endothelial wall (1-cell thick!) */}
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const x = 66 + i * 47;
      return (
        <g key={`cap-cell-${i}`}>
          <rect
            x={x}
            y={172}
            width="45"
            height="9"
            rx="4.5"
            fill="#FCA5A5"
            stroke="#B91C1C"
            strokeWidth="1.2"
          />
          <ellipse cx={x + 22} cy={176.5} rx="6" ry="2.2" fill="#7F1D1D" />
        </g>
      );
    })}

    {/* Capillary lumen */}
    <rect x="14" y="181" width="392" height="46" rx="12" fill="url(#og-diff-blood)" stroke="#DC2626" strokeWidth="1.6" />
    {/* Bottom capillary wall */}
    <line x1="20" y1="227" x2="400" y2="227" stroke="#B91C1C" strokeWidth="4" />

    {/* Red blood cells transitioning from dark venous red -> bright arterial crimson */}
    {[
      { x: 56, y: 204, color: RESPIRATION_PALETTE.venousDark },
      { x: 126, y: 202, color: '#991B1B' },
      { x: 204, y: 205, color: '#DC2626' },
      { x: 284, y: 202, color: RESPIRATION_PALETTE.arterialRed },
      { x: 358, y: 204, color: '#FF3B30' },
    ].map((rbc, idx) => (
      <g key={idx} transform={`translate(${rbc.x}, ${rbc.y})`}>
        <ellipse cx="0" cy="0" rx="15" ry="9" fill={rbc.color} stroke="#7F1D1D" strokeWidth="1.2" />
        <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#FFFFFF" fillOpacity="0.24" />
      </g>
    ))}

    {/* O2 Diffusion arrows (Alveolus -> Capillary) */}
    <path
      d="M 152 126 L 152 192"
      fill="none"
      stroke={RESPIRATION_PALETTE.inhale}
      strokeWidth="3.5"
      markerEnd="url(#og-diff-o2)"
    />
    <path
      d="M 184 126 L 184 192"
      fill="none"
      stroke={RESPIRATION_PALETTE.inhale}
      strokeWidth="3.5"
      markerEnd="url(#og-diff-o2)"
    />
    <rect x="130" y="102" width="76" height="22" rx="6" fill={RESPIRATION_PALETTE.inhaleLight} stroke={RESPIRATION_PALETTE.inhale} />
    <text x="168" y="117" textAnchor="middle" fill="#0369A1" fontSize="11" fontWeight="800">
      O₂ 확산 (↓)
    </text>

    {/* CO2 Diffusion arrows (Capillary -> Alveolus) */}
    <path
      d="M 244 194 L 244 130"
      fill="none"
      stroke={RESPIRATION_PALETTE.exhale}
      strokeWidth="3.5"
      markerEnd="url(#og-diff-co2)"
    />
    <path
      d="M 276 194 L 276 130"
      fill="none"
      stroke={RESPIRATION_PALETTE.exhale}
      strokeWidth="3.5"
      markerEnd="url(#og-diff-co2)"
    />
    <rect x="220" y="102" width="84" height="22" rx="6" fill={RESPIRATION_PALETTE.exhaleLight} stroke={RESPIRATION_PALETTE.exhale} />
    <text x="262" y="117" textAnchor="middle" fill="#C2591B" fontSize="11" fontWeight="800">
      CO₂ 확산 (↑)
    </text>

    {/* Title & partial pressure callouts */}
    <rect x="12" y="10" width="194" height="24" rx="6" fill="#0F172A" />
    <text x="109" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="700">
      단일 폐포 단면 · 분압 차 기체 교환
    </text>

    <text x="206" y="76" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="700">
      폐포 내부 (O₂ 분압 높음 · CO₂ 분압 낮음)
    </text>

    {/* 1-cell thick callout */}
    <rect x="308" y="138" width="104" height="32" rx="5" fill="#FFFFFF" fillOpacity="0.94" stroke="#E11D48" />
    <text x="360" y="151" textAnchor="middle" fill="#9F1239" fontSize="9.5" fontWeight="700">
      한 층의 얇은 세포벽
    </text>
    <text x="360" y="164" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="600">
      (폐포벽 + 모세혈관벽)
    </text>

    {/* Blood flow direction labels */}
    <text x="72" y="248" textAnchor="middle" fill={RESPIRATION_PALETTE.venousDark} fontSize="10.5" fontWeight="700">
      정맥혈 유입 (O₂↓ CO₂↑)
    </text>
    <text x="210" y="248" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="700">
      → 혈류 방향 →
    </text>
    <text x="348" y="248" textAnchor="middle" fill="#B91C1C" fontSize="10.5" fontWeight="700">
      동맥혈 유출 (O₂↑ CO₂↓)
    </text>
  </g>
);

export const OrganGallerySvg: React.FC<OrganGallerySvgProps> = ({
  assetId,
  className,
}) => {
  return (
    <svg
      viewBox="0 0 420 260"
      className={className}
      role="img"
      aria-label={`호흡계 현미경 및 단면 일러스트 (${assetId})`}
    >
      {assetId === 'nasal_cilia' && <NasalCiliaIllustration />}
      {assetId === 'trachea_cartilage' && <TracheaCartilageIllustration />}
      {assetId === 'alveoli_capillaries' && <AlveoliCapillariesIllustration />}
      {assetId === 'alveoli_diffusion' && <AlveoliDiffusionIllustration />}
    </svg>
  );
};
