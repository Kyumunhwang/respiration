import type { PhysicsParams } from '../types/respiration';

export type BreathingMode = 'manual' | 'normal' | 'exercise';
export type BreathingDirection = 'inhale' | 'exhale' | 'neutral';

/**
 * Instantaneous thoracic and alveolar mechanical state computed from
 * the breathing phase, mode, and Boyle's law parameters.
 */
export interface ThoracicState {
  phase: number;
  mode: BreathingMode;
  direction: BreathingDirection;
  thoracicVolumeMl: number;
  lungVolumeMl: number;
  thoracicPressureMmHg: number;
  alveolarPressureMmHg: number;
  baselinePressureMmHg: number;
  pressureDeltaMmHg: number;
  airflowVelocity: number;
  boyleConstant: number;
}

const MANUAL_NEUTRAL_DEADZONE = 0.04;
const PRESSURE_FLOW_THRESHOLD_MMHG = 0.05;
const MANUAL_ALVEOLAR_BOYLE_SCALE = 0.035;
const MANUAL_THORACIC_BOYLE_SCALE = 0.055;

function clampPhase(phase: number): number {
  if (!Number.isFinite(phase)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, phase));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Computes thoracic/lung volumes, Boyle's law pressures, and resulting airflow
 * direction & velocity for the Korean Grade 8 respiration simulation.
 */
export function computeThoracicState(
  phase: number,
  mode: BreathingMode,
  phaseDirectionHint: BreathingDirection,
  params: PhysicsParams
): ThoracicState {
  const clampedPhase = clampPhase(phase);
  const p0 = params.baselinePressureMmHg;
  const vRest = params.restThoracicVolumeMl;

  // Smoothly interpolate thoracic cavity volume across [-1, 0, +1]
  const thoracicVolumeRaw =
    clampedPhase >= 0
      ? vRest + clampedPhase * (params.maxThoracicVolumeMl - vRest)
      : vRest + clampedPhase * (vRest - params.minThoracicVolumeMl);

  // Lungs have no muscles and passively scale with thoracic cavity volume
  const lungVolumeRaw = params.restLungVolumeMl * (thoracicVolumeRaw / vRest);

  let alveolarPressureMmHg = p0;
  let thoracicPressureMmHg = p0;

  if (mode === 'manual') {
    if (Math.abs(clampedPhase) > MANUAL_NEUTRAL_DEADZONE) {
      const boyleRawDelta = p0 * (vRest / thoracicVolumeRaw) - p0;
      alveolarPressureMmHg = roundTo(p0 + boyleRawDelta * MANUAL_ALVEOLAR_BOYLE_SCALE, 2);
      thoracicPressureMmHg = roundTo(p0 + boyleRawDelta * MANUAL_THORACIC_BOYLE_SCALE, 2);
    }
  } else {
    // Auto-breathing: pressure gradient follows active respiratory muscle drive
    const flowWeight = Math.sqrt(Math.max(0, 1 - clampedPhase * clampedPhase));
    const isExercise = mode === 'exercise';

    if (phaseDirectionHint === 'inhale') {
      const alvOffset = isExercise ? 0.4 + 2.6 * flowWeight : 0.3 + 1.5 * flowWeight;
      const thorOffset = isExercise ? 4.4 + 1.6 * flowWeight : 4.2 + 1.4 * flowWeight;
      alveolarPressureMmHg = roundTo(p0 - alvOffset, 2);
      thoracicPressureMmHg = roundTo(p0 - thorOffset, 2);
    } else if (phaseDirectionHint === 'exhale') {
      const alvOffset = isExercise ? 0.4 + 2.6 * flowWeight : 0.3 + 1.5 * flowWeight;
      const thorOffset = isExercise ? 0.8 + 2.8 * flowWeight : 0.6 + 1.8 * flowWeight;
      alveolarPressureMmHg = roundTo(p0 + alvOffset, 2);
      thoracicPressureMmHg = roundTo(p0 + thorOffset, 2);
    }
  }

  let direction: BreathingDirection = 'neutral';
  let airflowVelocity = 0;

  if (alveolarPressureMmHg < p0 - PRESSURE_FLOW_THRESHOLD_MMHG) {
    direction = 'inhale';
    airflowVelocity = roundTo(Math.min(1, (p0 - alveolarPressureMmHg) / 3.8), 3);
  } else if (alveolarPressureMmHg > p0 + PRESSURE_FLOW_THRESHOLD_MMHG) {
    direction = 'exhale';
    airflowVelocity = roundTo(-Math.min(1, (alveolarPressureMmHg - p0) / 3.8), 3);
  }

  return {
    phase: roundTo(clampedPhase, 4),
    mode,
    direction,
    thoracicVolumeMl: Math.round(thoracicVolumeRaw),
    lungVolumeMl: Math.round(lungVolumeRaw),
    thoracicPressureMmHg,
    alveolarPressureMmHg,
    baselinePressureMmHg: p0,
    pressureDeltaMmHg: roundTo(alveolarPressureMmHg - p0, 2),
    airflowVelocity,
    boyleConstant: Math.round(p0 * vRest),
  };
}

/**
 * Helper to compute sinusoidal breathing phase and active direction hint
 * from elapsed seconds and target BPM mode.
 */
export function computeAutoBreathingSample(
  elapsedSeconds: number,
  mode: 'normal' | 'exercise',
  params: PhysicsParams
): { phase: number; directionHint: BreathingDirection } {
  const bpm = mode === 'exercise' ? params.exerciseBpm : params.normalBpm;
  const omega = (2 * Math.PI * bpm) / 60;
  const angle = omega * elapsedSeconds;
  const phase = Math.sin(angle);
  const velocity = Math.cos(angle);

  let directionHint: BreathingDirection = 'neutral';
  if (velocity > 0.001) {
    directionHint = 'inhale';
  } else if (velocity < -0.001) {
    directionHint = 'exhale';
  }

  return { phase, directionHint };
}
