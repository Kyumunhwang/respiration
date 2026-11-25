import React from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Eye,
  HelpCircle,
  Lightbulb,
  Microscope,
  Wind,
} from 'lucide-react';
import type { OrganId, OrganInfo, RespirationDataset } from '../types/respiration';
import { ThoraxAnatomySvg } from './visuals/ThoraxAnatomySvg';
import { OrganGallerySvg } from './visuals/OrganGallerySvg';

/**
 * Props for Tab 1: Interactive Respiratory System Structure & Function Explorer.
 */
export interface StructureExplorerTabProps {
  dataset: RespirationDataset;
  selectedOrganId: OrganId;
  onSelectOrgan: (id: OrganId) => void;
  blindMode: boolean;
  revealedLabels: Record<string, boolean>;
  onRevealLabel: (key: string) => void;
}

const PATHWAY_SHORT_LABELS: Record<OrganId, string> = {
  nasal: '코',
  trachea: '기관',
  bronchi: '기관지',
  lungs: '폐',
  alveoli: '폐포',
};

const SELECTOR_LABELS: Record<OrganId, string> = {
  nasal: '코(비강)',
  trachea: '기관',
  bronchi: '기관지',
  lungs: '폐',
  alveoli: '폐포',
};

/**
 * Resolves whether a given organ label is currently visible (either blindMode
 * is off, or its reveal key has been unlocked).
 */
function isOrganLabelVisible(
  organId: OrganId,
  blindMode: boolean,
  revealedLabels: Record<string, boolean>
): boolean {
  if (!blindMode) {
    return true;
  }
  return Boolean(revealedLabels[organId] || revealedLabels[`organ_${organId}`]);
}

/**
 * Tab 1 view: Two-column smartboard layout pairing interactive human respiratory
 * anatomy on the left with detailed physiological notes, microscope/cross-section
 * SVG gallery, and teacher questioning tips on the right.
 */
export const StructureExplorerTab: React.FC<StructureExplorerTabProps> = ({
  dataset,
  selectedOrganId,
  onSelectOrgan,
  blindMode,
  revealedLabels,
  onRevealLabel,
}) => {
  const selectedOrgan: OrganInfo =
    dataset.organs.find((organ) => organ.id === selectedOrganId) ??
    dataset.organs[0];

  const isSelectedVisible = isOrganLabelVisible(
    selectedOrgan.id,
    blindMode,
    revealedLabels
  );

  const handleRevealOrgan = (
    organId: OrganId,
    event?: React.MouseEvent
  ): void => {
    if (event) {
      event.stopPropagation();
    }
    onRevealLabel(organId);
  };

  return (
    <div className="lab-grid-2col">
      {/* Left Column: Interactive Anatomy SVG + Organ Selectors + Pathway Breadcrumb */}
      <section className="lab-card" aria-label="호흡계 모식도 탐색">
        <div className="lab-card-header">
          <h2 className="lab-card-title">
            <Wind size={18} color="#0077b6" />
            <span>사람의 호흡계 구조</span>
          </h2>
          <span className="badge badge-inhale">
            {blindMode
              ? '블라인드 모드: 기관을 누르거나 ? 로 정답 확인'
              : '기관을 클릭해 구조와 기능을 탐색하세요'}
          </span>
        </div>

        <div
          className="lab-card-body no-scroll"
          style={{ gap: '8px', padding: '10px 12px' }}
        >
          {/* Airway Pathway Breadcrumb: 코 → 기관 → 기관지 → 폐 → 폐포 */}
          <div
            aria-label="공기 이동 경로"
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px',
              padding: '6px 10px',
              backgroundColor: 'var(--color-surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-light)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                marginRight: '4px',
              }}
            >
              공기 이동 경로:
            </span>
            {dataset.organs.map((organ, index) => {
              const isSelected = organ.id === selectedOrgan.id;
              const visible = isOrganLabelVisible(
                organ.id,
                blindMode,
                revealedLabels
              );

              return (
                <React.Fragment key={organ.id}>
                  {index > 0 && (
                    <ChevronRight
                      size={14}
                      color="#64748b"
                      aria-hidden="true"
                    />
                  )}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectOrgan(organ.id)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        border: isSelected
                          ? `1.5px solid ${organ.highlightColor}`
                          : '1px solid var(--color-border)',
                        backgroundColor: isSelected
                          ? `${organ.highlightColor}22`
                          : '#ffffff',
                        color: 'var(--color-text)',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                      }}
                    >
                      {visible ? PATHWAY_SHORT_LABELS[organ.id] : `${index + 1}단계`}
                    </button>
                    {blindMode && !visible && (
                      <button
                        type="button"
                        className="blind-pill is-hidden"
                        style={{ minWidth: '26px', padding: '1px 6px', fontSize: '0.74rem' }}
                        onClick={(e) => handleRevealOrgan(organ.id, e)}
                        title="클릭하여 기관 이름 공개"
                      >
                        ?
                      </button>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Interactive Thorax Anatomy SVG Stage */}
          <div className="svg-stage" style={{ flex: '1 1 0', minHeight: 0 }}>
            <ThoraxAnatomySvg
              phase={0}
              selectedTarget={selectedOrgan.id}
              onSelectOrgan={onSelectOrgan}
              blindMode={blindMode}
              revealedLabels={revealedLabels}
              onRevealLabel={onRevealLabel}
              showLabels={true}
            />
          </div>

          {/* Clickable 5-Organ Selector Bar */}
          <div
            role="group"
            aria-label="호흡계 기관 선택 버튼"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            {dataset.organs.map((organ, idx) => {
              const isSelected = organ.id === selectedOrgan.id;
              const visible = isOrganLabelVisible(
                organ.id,
                blindMode,
                revealedLabels
              );

              return (
                <div
                  key={organ.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectOrgan(organ.id)}
                    aria-pressed={isSelected}
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '7px 6px',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 800 : 600,
                      borderWidth: isSelected ? '2px' : '1px',
                      borderColor: isSelected
                        ? organ.highlightColor
                        : 'var(--color-border)',
                      backgroundColor: isSelected
                        ? `${organ.highlightColor}1A`
                        : '#ffffff',
                      color: 'var(--color-text)',
                      justifyContent: 'center',
                    }}
                  >
                    {visible ? (
                      <span>{SELECTOR_LABELS[organ.id]}</span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>기관 {idx + 1}</span>
                      </span>
                    )}
                  </button>

                  {blindMode && (
                    <button
                      type="button"
                      className={`blind-pill ${
                        visible ? 'is-revealed' : 'is-hidden'
                      }`}
                      style={{
                        width: '100%',
                        fontSize: '0.74rem',
                        padding: '2px 6px',
                      }}
                      onClick={(e) => handleRevealOrgan(organ.id, e)}
                      disabled={visible}
                    >
                      {visible ? (
                        <>
                          <Eye size={12} />
                          <span>{PATHWAY_SHORT_LABELS[organ.id]}</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle size={12} />
                          <span>이름 보기 (?)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Right Column: Organ Detail Card + Microscope Gallery + Teacher Tip */}
      <section className="lab-card" aria-label="선택된 기관 상세 정보">
        <div className="lab-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span
              aria-hidden="true"
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '9999px',
                backgroundColor: selectedOrgan.highlightColor,
                flexShrink: 0,
              }}
            />
            {isSelectedVisible ? (
              <h2 className="lab-card-title">
                <span>{selectedOrgan.nameKo}</span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {selectedOrgan.nameEn}
                </span>
              </h2>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                  }}
                >
                  이 기관의 이름은?
                </span>
                <button
                  type="button"
                  className="blind-pill is-hidden"
                  onClick={() => handleRevealOrgan(selectedOrgan.id)}
                >
                  ? 정답 공개
                </button>
              </div>
            )}
          </div>

          <span className="badge badge-neutral">
            {dataset.curriculumMeta.code} 핵심 구조
          </span>
        </div>

        <div
          className="lab-card-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Short Role Summary */}
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: `${selectedOrgan.highlightColor}14`,
              border: `1px solid ${selectedOrgan.highlightColor}55`,
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--color-text)',
            }}
          >
            {selectedOrgan.shortRole}
          </div>

          {/* Critical Misconception Callout for Lungs (Passivity) */}
          {selectedOrgan.id === 'lungs' && (
            <div
              className="callout-warning"
              role="note"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <AlertTriangle
                size={18}
                style={{ flexShrink: 0, marginTop: '2px' }}
                color="#d97706"
              />
              <div>
                <strong>중요 오개념 주의 (폐의 수동성):</strong> 폐에는 근육이
                없어 스스로 커지거나 작아지지 못합니다. 갈비뼈와 횡격막의
                움직임에 따른 흉강 부피·압력 변화로 <strong>수동적</strong>으로
                움직입니다.
              </div>
            </div>
          )}

          {/* Detailed Function Bullets */}
          <div>
            <h3
              style={{
                margin: '0 0 6px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
              }}
            >
              구조와 기능 자세히 보기
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                fontSize: '0.86rem',
                color: 'var(--color-text)',
              }}
            >
              {selectedOrgan.detailedFunctions.map((fnText, i) => (
                <li key={i}>{fnText}</li>
              ))}
            </ul>
          </div>

          {/* High-Resolution Microscope / Cross-Section SVG Gallery */}
          <div
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-light)',
              backgroundColor: 'var(--color-surface-muted)',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                }}
              >
                <Microscope size={16} color="#0077b6" />
                <span>{selectedOrgan.galleryTitle}</span>
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                현미경 · 단면 확대
              </span>
            </div>

            <div
              style={{
                width: '100%',
                aspectRatio: '420 / 220',
                maxHeight: '210px',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <OrganGallerySvg assetId={selectedOrgan.galleryAssetId} />
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              {selectedOrgan.galleryCaption}
            </p>
          </div>

          {/* Teacher Questioning Tip Callout */}
          <div
            className="callout-tip"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginTop: 'auto',
            }}
          >
            <Lightbulb
              size={18}
              style={{ flexShrink: 0, marginTop: '2px' }}
              color="#0077b6"
            />
            <div>
              <strong>교사용 발문 팁:</strong> {selectedOrgan.teacherQuestionTip}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
