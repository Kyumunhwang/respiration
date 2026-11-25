import React from 'react';
import {
  Activity,
  ClipboardCheck,
  Eye,
  EyeOff,
  Presentation,
} from 'lucide-react';
import type { TabId } from '../types/respiration';

/**
 * Props for the top smartboard navigation bar and classroom tool triggers.
 */
export interface HeaderNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  blindMode: boolean;
  onToggleBlindMode: () => void;
  onOpenQuizModal: () => void;
  showTeacherBar: boolean;
  onToggleTeacherBar: () => void;
}

interface TabDefinition {
  id: TabId;
  label: string;
}

const PRIMARY_TABS: TabDefinition[] = [
  { id: 'structure', label: '[탭 1] 호흡계의 구조와 기능' },
  { id: 'mechanics', label: '[탭 2] 호흡 운동의 원리 (인체)' },
  { id: 'bottle', label: '[탭 3] 페트병 호흡 모형 비교' },
  { id: 'alveoli', label: '[탭 4] 폐포의 구조와 기체 교환' },
];

/**
 * Persistent top navigation bar displaying curriculum branding, 4 primary
 * lesson tabs, and quick-access classroom controls (Blind Quiz, Teacher Tools,
 * and 6-item Misconception Quiz modal).
 */
export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  onSelectTab,
  blindMode,
  onToggleBlindMode,
  onOpenQuizModal,
  showTeacherBar,
  onToggleTeacherBar,
}) => {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <div className="app-header-icon" aria-hidden="true">
          <Activity size={20} strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="app-header-title">호흡 가상 실험실</h1>
          <p className="app-header-subtitle">
            중2 과학 [9과11-03] 호흡계 구조 · 호흡 운동 · 기체 교환
          </p>
        </div>
      </div>

      <nav
        className="tab-nav"
        role="tablist"
        aria-label="호흡 시뮬레이션 학습 탭"
        style={{ overflowX: 'auto', maxWidth: '100%' }}
      >
        {PRIMARY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tab-btn${isActive ? ' is-active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="app-header-actions">
        <button
          type="button"
          className={`btn btn-header${blindMode ? ' is-active' : ''}`}
          aria-pressed={blindMode}
          onClick={onToggleBlindMode}
          title="용어와 방향 화살표를 ? 로 가려 수업 중 퀴즈로 활용합니다"
        >
          {blindMode ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{blindMode ? '블라인드 퀴즈 ON' : '블라인드 퀴즈 OFF'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-header${showTeacherBar ? ' is-active' : ''}`}
          aria-pressed={showTeacherBar}
          onClick={onToggleTeacherBar}
          title="단계별 수업 모드 및 교사용 발문 팁 막대를 열거나 닫습니다"
        >
          <Presentation size={16} />
          <span>수업 도구</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenQuizModal}
          style={{
            backgroundColor: '#0284c7',
            borderColor: '#38bdf8',
          }}
        >
          <ClipboardCheck size={16} />
          <span>오개념 OX 퀴즈 (6문항)</span>
        </button>
      </div>
    </header>
  );
};
