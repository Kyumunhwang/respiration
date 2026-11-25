import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { CausalDirection, CausalStep } from '../types/respiration';

/**
 * Props for the persistent 6-step causal chain footer bar.
 */
export interface CausalChainBarProps {
  steps: CausalStep[];
  mode: 'inhale' | 'exhale' | 'neutral';
  activeStepIndex: number | null;
  blindMode: boolean;
  revealedLabels: Record<string, boolean>;
  onRevealLabel: (key: string) => void;
  onStepClick?: (stepIndex: number) => void;
}

interface StepBadgeVisual {
  shortText: string;
  badgeClass: string;
  detailText: string;
}

/**
 * Maps a CausalStep and current breathing mode into a concise, high-contrast
 * directional badge label and semantic CSS class.
 */
function getStepBadgeVisual(
  step: CausalStep,
  mode: 'inhale' | 'exhale' | 'neutral'
): StepBadgeVisual {
  if (mode === 'neutral') {
    return {
      shortText: '평상시 유지',
      badgeClass: 'badge badge-neutral',
      detailText: '호흡 운동이 정지된 평상시 대기압 평형 상태 (760 mmHg)',
    };
  }

  const isInhale = mode === 'inhale';
  const dir: CausalDirection = isInhale
    ? step.inhaleDirection
    : step.exhaleDirection;
  const fullText = isInhale ? step.inhaleText : step.exhaleText;

  if (step.id === 'rib_diaphragm') {
    return {
      shortText: isInhale ? '갈비뼈 ▲ · 횡격막 ▼' : '갈비뼈 ▼ · 횡격막 ▲',
      badgeClass: isInhale ? 'badge badge-inhale' : 'badge badge-exhale',
      detailText: fullText,
    };
  }

  if (step.id === 'airflow') {
    return {
      shortText: dir === 'in' ? '유입 (외부→폐)' : '유출 (폐→외부)',
      badgeClass: dir === 'in' ? 'badge badge-inhale' : 'badge badge-exhale',
      detailText: fullText,
    };
  }

  if (step.id === 'lung_pressure') {
    return {
      shortText: dir === 'up' ? '▲ 증가 (＞대기압)' : '▼ 감소 (＜대기압)',
      badgeClass: dir === 'up' ? 'badge badge-up' : 'badge badge-down',
      detailText: fullText,
    };
  }

  return {
    shortText: dir === 'up' ? '▲ 증가' : '▼ 감소',
    badgeClass: dir === 'up' ? 'badge badge-up' : 'badge badge-down',
    detailText: fullText,
  };
}

/**
 * Persistent bottom dock displaying the 6-step causal chain of human breathing:
 * [갈비뼈·횡격막 움직임] → [흉강 부피] → [흉강 압력] → [폐 부피] → [폐 내부 압력] → [공기 이동].
 * Supports Blind Quiz masking (`?` pills per step) and Step-by-Step active highlighting.
 */
export const CausalChainBar: React.FC<CausalChainBarProps> = ({
  steps,
  mode,
  activeStepIndex,
  blindMode,
  revealedLabels,
  onRevealLabel,
  onStepClick,
}) => {
  const orderedSteps = [...steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const activeStep =
    activeStepIndex !== null
      ? orderedSteps.find((s) => s.stepIndex === activeStepIndex) ?? null
      : null;

  const modeBadge =
    mode === 'inhale'
      ? {
          label: '들숨 (흡기)',
          style: {
            backgroundColor: '#00B4D8',
            color: '#082f49',
            borderColor: '#0077b6',
          },
        }
      : mode === 'exhale'
        ? {
            label: '날숨 (호기)',
            style: {
              backgroundColor: '#F4A261',
              color: '#431407',
              borderColor: '#c2591b',
            },
          }
        : {
            label: '평상시 (760 mmHg)',
            style: {
              backgroundColor: 'var(--color-surface-muted)',
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
            },
          };

  const isActiveStepRevealed =
    activeStep !== null &&
    (!blindMode || Boolean(revealedLabels[`causal_${activeStep.stepIndex}`]));

  return (
    <footer className="app-footer-causal" aria-label="호흡 운동 6단계 인과관계">
      {/* Header strip: Current state badge + Step-by-Step misconception banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '6px',
          minHeight: '26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--color-text-secondary)',
            }}
          >
            호흡 운동 6단계 인과관계
          </span>
          <span className="badge" style={modeBadge.style}>
            {modeBadge.label}
          </span>
        </div>

        {activeStep ? (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              color: '#78350f',
              fontSize: '0.78rem',
              fontWeight: 600,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} color="#d97706" />
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={
                isActiveStepRevealed
                  ? activeStep.misconceptionNote
                  : '블라인드 모드에서는 ? 버튼을 눌러 정답을 먼저 확인하세요.'
              }
            >
              <strong>
                [{activeStep.stepIndex}단계: {activeStep.label}]
              </strong>{' '}
              {isActiveStepRevealed
                ? activeStep.misconceptionNote
                : '블라인드 모드: 아래 ? 버튼을 눌러 방향과 원리를 확인하세요.'}
            </span>
          </div>
        ) : (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {blindMode
              ? '블라인드 모드 켜짐: 각 단계의 ? 버튼을 눌러 결과를 확인하세요'
              : '부피가 먼저 변해야 압력이 변하고 공기가 이동합니다'}
          </span>
        )}
      </div>

      {/* 6-Step Causal Flow Cards */}
      <div className="causal-bar">
        {orderedSteps.map((step, idx) => {
          const revealKey = `causal_${step.stepIndex}`;
          const isRevealed = !blindMode || Boolean(revealedLabels[revealKey]);
          const isActive = activeStepIndex === step.stepIndex;
          const isDimmed =
            activeStepIndex !== null && activeStepIndex !== step.stepIndex;
          const badgeVisual = getStepBadgeVisual(step, mode);

          const stepClassName = [
            'causal-step',
            isActive ? 'is-active' : '',
            isDimmed ? 'is-dimmed' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div className="causal-arrow" aria-hidden="true">
                  <ArrowRight size={15} />
                </div>
              )}

              <div
                className={stepClassName}
                role={onStepClick ? 'button' : undefined}
                tabIndex={onStepClick ? 0 : undefined}
                onClick={
                  onStepClick ? () => onStepClick(step.stepIndex) : undefined
                }
                onKeyDown={
                  onStepClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onStepClick(step.stepIndex);
                        }
                      }
                    : undefined
                }
                style={{
                  cursor: onStepClick ? 'pointer' : 'default',
                }}
                title={isRevealed ? badgeVisual.detailText : `${step.label} 확인`}
              >
                <div className="causal-step-title">
                  {step.stepIndex}. {step.label}
                </div>

                <div className="causal-step-value">
                  {!isRevealed ? (
                    <button
                      type="button"
                      className="blind-pill is-hidden"
                      style={{ width: '100%', padding: '2px 8px' }}
                      aria-label={`${step.stepIndex}단계 ${step.label} 결과 보기`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRevealLabel(revealKey);
                      }}
                    >
                      ?
                    </button>
                  ) : (
                    <span
                      className={badgeVisual.badgeClass}
                      style={{
                        width: '100%',
                        fontSize: '0.73rem',
                        padding: '2px 6px',
                      }}
                    >
                      {badgeVisual.shortText}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </footer>
  );
};
