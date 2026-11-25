import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rawRespirationData from './data/respirationData.json';
import type { OrganId, RespirationDataset, TabId } from './types/respiration';
import {
  computeAutoBreathingSample,
  computeThoracicState,
  type BreathingDirection,
  type BreathingMode,
} from './engine/respirationPhysics';
import { HeaderNav } from './components/HeaderNav';
import { TeacherControlBar } from './components/TeacherControlBar';
import { StructureExplorerTab } from './components/StructureExplorerTab';
import { ThoracicSimulation } from './components/ThoracicSimulation';
import { BottleModelSimulator } from './components/BottleModelSimulator';
import { AlveoliGasExchange } from './components/AlveoliGasExchange';
import { CausalChainBar } from './components/CausalChainBar';
import { MisconceptionQuizModal } from './components/MisconceptionQuizModal';

const DATASET = rawRespirationData as RespirationDataset;

const STATIC_BLIND_KEYS: readonly string[] = [
  'nasal',
  'trachea',
  'bronchi',
  'lungs',
  'alveoli',
  'ribcage',
  'diaphragm',
  'organ_nasal',
  'organ_trachea',
  'organ_bronchi',
  'organ_lungs',
  'organ_alveoli',
  'mechanics_direction',
  'mechanics_pressure_cmp',
  'mechanics_airflow_dir',
  'gas_alveolus_pressure',
  'gas_venous_pressure',
  'gas_arterial_pressure',
  'gas_o2_dir',
  'gas_co2_dir',
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('structure');
  const [selectedOrganId, setSelectedOrganId] = useState<OrganId>('nasal');

  // Classroom presenter & blind-quiz states
  const [blindMode, setBlindMode] = useState<boolean>(false);
  const [revealedLabels, setRevealedLabels] = useState<Record<string, boolean>>({});
  const [showTeacherBar, setShowTeacherBar] = useState<boolean>(true);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);

  // 6-step causal presentation mode
  const [stepModeActive, setStepModeActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [stepDirection, setStepDirection] = useState<'inhale' | 'exhale'>('inhale');

  // Tab 2 (Thoracic Mechanics) state
  const [phase, setPhase] = useState<number>(0);
  const [breathingMode, setBreathingMode] = useState<BreathingMode>('manual');
  const [phaseDirectionHint, setPhaseDirectionHint] = useState<BreathingDirection>('neutral');
  const autoPhaseRef = useRef<number>(0);

  // Tab 3 (Bottle Model) synced state for CausalChainBar
  const [bottleState, setBottleState] = useState<{
    phase: number;
    direction: BreathingDirection;
    bottlePressureMmHg: number;
  }>({
    phase: 0,
    direction: 'neutral',
    bottlePressureMmHg: DATASET.physicsParams.baselinePressureMmHg,
  });

  // Collect all blind-mode keys dynamically across all tabs + SVG labels
  const allBlindKeys = useMemo(() => {
    const keys = new Set<string>(STATIC_BLIND_KEYS);
    for (const step of DATASET.causalSteps) {
      keys.add(`causal_${step.stepIndex}`);
    }
    for (const mapping of DATASET.bottleMappings) {
      keys.add(`bottle_${mapping.id}`);
    }
    return Array.from(keys);
  }, []);

  // Auto-breathing RAF loop: active ONLY when Tab 2 is visible and mode is normal/exercise
  useEffect(() => {
    if (activeTab !== 'mechanics' || breathingMode === 'manual') {
      return undefined;
    }

    const bpm =
      breathingMode === 'exercise'
        ? DATASET.physicsParams.exerciseBpm
        : DATASET.physicsParams.normalBpm;
    const omega = (2 * Math.PI * bpm) / 60;
    const clampedStartPhase = Math.max(-1, Math.min(1, autoPhaseRef.current));
    const initialElapsed = Math.asin(clampedStartPhase) / omega;
    const startWallMs = performance.now();

    let rafId = 0;

    const tick = (now: number) => {
      const elapsedSeconds = initialElapsed + (now - startWallMs) / 1000;
      const sample = computeAutoBreathingSample(
        elapsedSeconds,
        breathingMode,
        DATASET.physicsParams
      );
      autoPhaseRef.current = sample.phase;
      setPhase(sample.phase);
      setPhaseDirectionHint(sample.directionHint);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [activeTab, breathingMode]);

  const handlePhaseChange = useCallback((nextPhase: number) => {
    autoPhaseRef.current = nextPhase;
    setPhase(nextPhase);
    setPhaseDirectionHint('neutral');
  }, []);

  const handleBreathingModeChange = useCallback((nextMode: BreathingMode) => {
    setBreathingMode(nextMode);
    if (nextMode === 'manual') {
      setPhaseDirectionHint('neutral');
    }
  }, []);

  const thoracicState = useMemo(
    () =>
      computeThoracicState(
        phase,
        breathingMode,
        phaseDirectionHint,
        DATASET.physicsParams
      ),
    [phase, breathingMode, phaseDirectionHint]
  );

  const handleToggleBlindMode = useCallback(() => {
    setBlindMode((prev) => {
      const next = !prev;
      if (next) {
        setRevealedLabels({});
      }
      return next;
    });
  }, []);

  const handleRevealLabel = useCallback((key: string) => {
    setRevealedLabels((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  const handleRevealAllBlind = useCallback(() => {
    const nextMap: Record<string, boolean> = {};
    for (const key of allBlindKeys) {
      nextMap[key] = true;
    }
    setRevealedLabels(nextMap);
  }, [allBlindKeys]);

  const handleHideAllBlind = useCallback(() => {
    setRevealedLabels({});
  }, []);

  const handleStartStepMode = useCallback(
    (direction: 'inhale' | 'exhale') => {
      setStepDirection(direction);
      setStepModeActive(true);
      setCurrentStep(1);
      if (activeTab === 'mechanics') {
        setBreathingMode('manual');
        const targetPhase = direction === 'inhale' ? 0.85 : -0.85;
        autoPhaseRef.current = targetPhase;
        setPhase(targetPhase);
        setPhaseDirectionHint('neutral');
      }
    },
    [activeTab]
  );

  const handleNextStep = useCallback(() => {
    setCurrentStep((prev) => (prev === null ? 1 : Math.min(6, prev + 1)));
  }, []);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((prev) => (prev === null ? 1 : Math.max(1, prev - 1)));
  }, []);

  const handleExitStepMode = useCallback(() => {
    setStepModeActive(false);
    setCurrentStep(null);
  }, []);

  const handleBottleStateChange = useCallback(
    (nextState: {
      phase: number;
      direction: BreathingDirection;
      bottlePressureMmHg: number;
    }) => {
      setBottleState(nextState);
    },
    []
  );

  const causalMode: BreathingDirection = useMemo(() => {
    if (stepModeActive) {
      return stepDirection;
    }
    if (activeTab === 'mechanics') {
      return thoracicState.direction;
    }
    if (activeTab === 'bottle') {
      return bottleState.direction;
    }
    return 'neutral';
  }, [stepModeActive, stepDirection, activeTab, thoracicState.direction, bottleState.direction]);

  const handleCausalStepClick = useCallback(
    (stepIndex: number) => {
      if (stepModeActive) {
        setCurrentStep(stepIndex);
        return;
      }
      const nextDirection = causalMode === 'exhale' ? 'exhale' : 'inhale';
      setStepDirection(nextDirection);
      setStepModeActive(true);
      setCurrentStep(stepIndex);
    },
    [stepModeActive, causalMode]
  );

  const activeTabTip = DATASET.tabTeacherTips[activeTab];

  return (
    <div className="app-shell">
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        blindMode={blindMode}
        onToggleBlindMode={handleToggleBlindMode}
        onOpenQuizModal={() => setIsQuizModalOpen(true)}
        showTeacherBar={showTeacherBar}
        onToggleTeacherBar={() => setShowTeacherBar((prev) => !prev)}
      />

      <main className="app-main">
        {showTeacherBar && (
          <TeacherControlBar
            blindMode={blindMode}
            onToggleBlindMode={handleToggleBlindMode}
            onRevealAllBlind={handleRevealAllBlind}
            onHideAllBlind={handleHideAllBlind}
            stepModeActive={stepModeActive}
            currentStep={currentStep}
            stepDirection={stepDirection}
            onStartStepMode={handleStartStepMode}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            onExitStepMode={handleExitStepMode}
            activeTabTip={activeTabTip}
          />
        )}

        <div
          style={{
            flex: '1 1 0',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {activeTab === 'structure' && (
            <StructureExplorerTab
              dataset={DATASET}
              selectedOrganId={selectedOrganId}
              onSelectOrgan={setSelectedOrganId}
              blindMode={blindMode}
              revealedLabels={revealedLabels}
              onRevealLabel={handleRevealLabel}
            />
          )}

          {activeTab === 'mechanics' && (
            <ThoracicSimulation
              phase={phase}
              onPhaseChange={handlePhaseChange}
              breathingMode={breathingMode}
              onBreathingModeChange={handleBreathingModeChange}
              thoracicState={thoracicState}
              blindMode={blindMode}
              revealedLabels={revealedLabels}
              onRevealLabel={handleRevealLabel}
              activeCausalStep={stepModeActive ? currentStep : null}
              dataset={DATASET}
            />
          )}

          {activeTab === 'bottle' && (
            <BottleModelSimulator
              dataset={DATASET}
              blindMode={blindMode}
              revealedLabels={revealedLabels}
              onRevealLabel={handleRevealLabel}
              onBottleStateChange={handleBottleStateChange}
            />
          )}

          {activeTab === 'alveoli' && (
            <AlveoliGasExchange
              dataset={DATASET}
              blindMode={blindMode}
              revealedLabels={revealedLabels}
              onRevealLabel={handleRevealLabel}
            />
          )}
        </div>
      </main>

      <CausalChainBar
        steps={DATASET.causalSteps}
        mode={causalMode}
        activeStepIndex={stepModeActive ? currentStep : null}
        blindMode={blindMode}
        revealedLabels={revealedLabels}
        onRevealLabel={handleRevealLabel}
        onStepClick={handleCausalStepClick}
      />

      <MisconceptionQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        quizzes={DATASET.misconceptionQuizzes}
      />
    </div>
  );
}

export default App;
