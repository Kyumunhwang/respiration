import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  HelpCircle,
  Lightbulb,
  Play,
  Square,
} from 'lucide-react';
import type { TabTeacherTip } from '../types/respiration';

/**
 * Props for the smartboard-friendly presenter control strip (`TeacherControlBar`).
 */
export interface TeacherControlBarProps {
  blindMode: boolean;
  onToggleBlindMode: () => void;
  onRevealAllBlind: () => void;
  onHideAllBlind: () => void;
  stepModeActive: boolean;
  currentStep: number | null;
  stepDirection: 'inhale' | 'exhale';
  onStartStepMode: (direction: 'inhale' | 'exhale') => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onExitStepMode: () => void;
  activeTabTip: TabTeacherTip;
}

/**
 * Compact classroom presenter strip for smartboard instruction:
 * - Blind Quiz (`?`) masking controls
 * - 6-stage causal presentation step controls (inhale / exhale)
 * - Active tab core question & expected misconception quick-reference bar
 */
export const TeacherControlBar: React.FC<TeacherControlBarProps> = ({
  blindMode,
  onToggleBlindMode,
  onRevealAllBlind,
  onHideAllBlind,
  stepModeActive,
  currentStep,
  stepDirection,
  onStartStepMode,
  onNextStep,
  onPrevStep,
  onExitStepMode,
  activeTabTip,
}) => {
  const [tipExpanded, setTipExpanded] = useState<boolean>(true);

  const normalizedStep =
    stepModeActive && currentStep !== null
      ? Math.min(6, Math.max(1, currentStep))
      : null;
  const canGoPrev = stepModeActive && normalizedStep !== null && normalizedStep > 1;
  const canGoNext = stepModeActive && normalizedStep !== null && normalizedStep < 6;

  return (
    <section
      aria-label="교사용 수업 제어 및 발문 도구"
      style={{
        flexShrink: 0,
        backgroundColor: '#ffffff',
        border: '1px solid var(--color-border-light)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: '6px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
      }}
    >
      {/* Top Row: Blind Quiz Controls + 6-Step Causal Presentation Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {/* Left Group: Blind Quiz Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={onToggleBlindMode}
            aria-pressed={blindMode}
            style={{
              padding: '5px 10px',
              fontSize: '0.78rem',
              backgroundColor: blindMode ? '#fef3c7' : '#f8fafc',
              borderColor: blindMode ? '#f59e0b' : 'var(--color-border)',
              color: blindMode ? '#92400e' : 'var(--color-text)',
              fontWeight: 700,
            }}
          >
            {blindMode ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>블라인드 퀴즈 {blindMode ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={onRevealAllBlind}
            disabled={!blindMode}
            title="가려진 모든 정답을 한 번에 공개합니다"
            style={{
              padding: '5px 9px',
              fontSize: '0.76rem',
              backgroundColor: blindMode ? '#ecfdf5' : '#f8fafc',
              borderColor: blindMode ? '#34d399' : 'var(--color-border-light)',
              color: blindMode ? '#065f46' : 'var(--color-text-muted)',
            }}
          >
            <Eye size={13} />
            <span>모두 공개</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={onHideAllBlind}
            disabled={!blindMode}
            title="모든 항목을 다시 물음표(?)로 가립니다"
            style={{
              padding: '5px 9px',
              fontSize: '0.76rem',
              backgroundColor: blindMode ? '#1e293b' : '#f8fafc',
              borderColor: blindMode ? '#334155' : 'var(--color-border-light)',
              color: blindMode ? '#fde047' : 'var(--color-text-muted)',
            }}
          >
            <HelpCircle size={13} />
            <span>모두 가리기(?)</span>
          </button>
        </div>

        {/* Right Group: 6-Stage Step-by-Step Causal Presentation Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={() => onStartStepMode('inhale')}
            aria-pressed={stepModeActive && stepDirection === 'inhale'}
            style={{
              padding: '5px 9px',
              fontSize: '0.77rem',
              backgroundColor:
                stepModeActive && stepDirection === 'inhale'
                  ? 'var(--color-inhale-dark)'
                  : 'var(--color-inhale-soft)',
              borderColor:
                stepModeActive && stepDirection === 'inhale'
                  ? 'var(--color-inhale-dark)'
                  : 'var(--color-inhale-border)',
              color:
                stepModeActive && stepDirection === 'inhale'
                  ? '#ffffff'
                  : 'var(--color-inhale-dark)',
              fontWeight: 700,
            }}
          >
            <Play size={12} />
            <span>들숨 6단계 수업</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => onStartStepMode('exhale')}
            aria-pressed={stepModeActive && stepDirection === 'exhale'}
            style={{
              padding: '5px 9px',
              fontSize: '0.77rem',
              backgroundColor:
                stepModeActive && stepDirection === 'exhale'
                  ? 'var(--color-exhale-dark)'
                  : 'var(--color-exhale-soft)',
              borderColor:
                stepModeActive && stepDirection === 'exhale'
                  ? 'var(--color-exhale-dark)'
                  : 'var(--color-exhale-border)',
              color:
                stepModeActive && stepDirection === 'exhale'
                  ? '#ffffff'
                  : 'var(--color-exhale-dark)',
              fontWeight: 700,
            }}
          >
            <Play size={12} />
            <span>날숨 6단계 수업</span>
          </button>

          <span
            aria-hidden="true"
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: 'var(--color-border-light)',
              margin: '0 2px',
            }}
          />

          <button
            type="button"
            className="btn"
            onClick={onPrevStep}
            disabled={!canGoPrev}
            style={{ padding: '5px 8px', fontSize: '0.76rem' }}
          >
            <ChevronLeft size={13} />
            <span>이전 단계</span>
          </button>

          <span
            aria-live="polite"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '58px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.76rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              backgroundColor: stepModeActive
                ? stepDirection === 'inhale'
                  ? 'var(--color-inhale-soft)'
                  : 'var(--color-exhale-soft)'
                : 'var(--color-surface-muted)',
              color: stepModeActive
                ? stepDirection === 'inhale'
                  ? 'var(--color-inhale-dark)'
                  : 'var(--color-exhale-dark)'
                : 'var(--color-text-muted)',
              border: `1px solid ${
                stepModeActive
                  ? stepDirection === 'inhale'
                    ? 'var(--color-inhale-border)'
                    : 'var(--color-exhale-border)'
                  : 'var(--color-border-light)'
              }`,
            }}
          >
            {stepModeActive && normalizedStep !== null
              ? `${stepDirection === 'inhale' ? '들숨' : '날숨'} ${normalizedStep}/6`
              : '대기 0/6'}
          </span>

          <button
            type="button"
            className="btn"
            onClick={onNextStep}
            disabled={!canGoNext}
            style={{ padding: '5px 8px', fontSize: '0.76rem' }}
          >
            <span>다음 단계</span>
            <ChevronRight size={13} />
          </button>

          <button
            type="button"
            className="btn"
            onClick={onExitStepMode}
            disabled={!stepModeActive}
            style={{
              padding: '5px 8px',
              fontSize: '0.76rem',
              backgroundColor: stepModeActive ? '#fee2e2' : '#f8fafc',
              borderColor: stepModeActive ? '#fca5a5' : 'var(--color-border-light)',
              color: stepModeActive ? '#991b1b' : 'var(--color-text-muted)',
            }}
          >
            <Square size={11} />
            <span>단계 모드 종료</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setTipExpanded((prev) => !prev)}
            aria-expanded={tipExpanded}
            title={tipExpanded ? '교사용 발문 팁 접기' : '교사용 발문 팁 펼치기'}
            style={{
              padding: '5px 7px',
              fontSize: '0.74rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            {tipExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>교사용 팁</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Active Tab Quick-Reference Question & Misconception Tip Strip */}
      {tipExpanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
            gap: '8px',
            paddingTop: '4px',
            borderTop: '1px dashed var(--color-border-light)',
            fontSize: '0.76rem',
            lineHeight: 1.35,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#eff6ff',
              color: '#1e3a8a',
            }}
          >
            <Lightbulb
              size={14}
              style={{ flexShrink: 0, marginTop: '1px', color: '#0284c7' }}
            />
            <div style={{ minWidth: 0 }}>
              <strong style={{ marginRight: '5px' }}>
                [{activeTabTip.tabTitle}] 핵심 발문:
              </strong>
              <span>{activeTabTip.coreQuestion}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#fffbeb',
              color: '#78350f',
            }}
          >
            <AlertTriangle
              size={14}
              style={{ flexShrink: 0, marginTop: '1px', color: '#d97706' }}
            />
            <div style={{ minWidth: 0 }}>
              <strong style={{ marginRight: '5px' }}>예상 오개념:</strong>
              <span>{activeTabTip.expectedMisconception}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
