/**
 * TypeScript schema definitions for the Korean Middle School 2nd-Grade Science
 * respiration simulation ([9과11-03] 호흡계의 구조와 기능, 호흡 운동의 원리).
 */

export type OrganId = 'nasal' | 'trachea' | 'bronchi' | 'lungs' | 'alveoli';

export type GalleryAssetId =
  | 'nasal_cilia'
  | 'trachea_cartilage'
  | 'alveoli_capillaries'
  | 'alveoli_diffusion';

export type TabId = 'structure' | 'mechanics' | 'bottle' | 'alveoli';

export type CausalDirection = 'up' | 'down' | 'in' | 'out';

export type BottleHumanTargetId =
  | OrganId
  | 'ribcage'
  | 'diaphragm'
  | 'thoracic_cavity';

export type PressureLevel = 'high' | 'medium' | 'low';

/**
 * Represents one step (1..6) in the causal chain of pulmonary ventilation
 * for both inhalation (들숨) and exhalation (날숨).
 */
export interface CausalStep {
  stepIndex: number;
  id: string;
  label: string;
  inhaleDirection: CausalDirection;
  inhaleText: string;
  exhaleDirection: CausalDirection;
  exhaleText: string;
  misconceptionNote: string;
}

/**
 * Anatomical and functional metadata for each respiratory organ, including
 * paired microscopic/cross-section gallery information and teacher prompts.
 */
export interface OrganInfo {
  id: OrganId;
  nameKo: string;
  nameEn: string;
  shortRole: string;
  detailedFunctions: string[];
  galleryAssetId: GalleryAssetId;
  galleryTitle: string;
  galleryCaption: string;
  teacherQuestionTip: string;
  highlightColor: string;
}

/**
 * 1:1 structural correspondence between the plastic bottle lung model
 * and human respiratory anatomy, highlighting model limitations.
 */
export interface BottleMappingItem {
  id: string;
  bottlePartName: string;
  humanOrganName: string;
  humanOrganId: BottleHumanTargetId;
  roleDescription: string;
  limitationNote: string;
  isLimitationHighlighted: boolean;
}

/**
 * Formative assessment quiz item targeting common middle school misconceptions.
 */
export interface MisconceptionQuizItem {
  id: string;
  type: 'OX' | 'BLANK';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  targetConcept: string;
}

/**
 * Physical constants and baseline physiological parameters for Boyle's law
 * pressure-volume simulation and breathing rate modes.
 */
export interface PhysicsParams {
  baselinePressureMmHg: number;
  normalBpm: number;
  exerciseBpm: number;
  restThoracicVolumeMl: number;
  minThoracicVolumeMl: number;
  maxThoracicVolumeMl: number;
  restLungVolumeMl: number;
}

/**
 * Partial pressure profile for a single respiratory compartment.
 */
export interface GasCompartmentProfile {
  id: 'alveolus' | 'venousBlood' | 'arterialBlood';
  nameKo: string;
  o2Level: PressureLevel;
  co2Level: PressureLevel;
  o2LevelKo: string;
  co2LevelKo: string;
  o2MmHg: number;
  co2MmHg: number;
  description: string;
}

/**
 * Conceptual and quantitative partial pressure facts driving O2/CO2 diffusion
 * across the alveolar-capillary membrane.
 */
export interface GasExchangeFacts {
  diffusionPrinciple: string;
  surfaceAreaPrinciple: string;
  alveolus: GasCompartmentProfile;
  venousBlood: GasCompartmentProfile;
  arterialBlood: GasCompartmentProfile;
  o2TransferDirection: string;
  co2TransferDirection: string;
}

/**
 * Pedagogical guidance for teachers per simulation tab.
 */
export interface TabTeacherTip {
  tabId: TabId;
  tabTitle: string;
  coreQuestion: string;
  followUpTips: string[];
  expectedMisconception: string;
}

/**
 * Curriculum achievement standard metadata.
 */
export interface CurriculumMeta {
  code: string;
  grade: string;
  unit: string;
  title: string;
  learningObjectives: string[];
}

/**
 * Root dataset contract exported by `src/data/respirationData.json`.
 */
export interface RespirationDataset {
  curriculumMeta: CurriculumMeta;
  organs: OrganInfo[];
  causalSteps: CausalStep[];
  bottleMappings: BottleMappingItem[];
  misconceptionQuizzes: MisconceptionQuizItem[];
  physicsParams: PhysicsParams;
  gasExchangeFacts: GasExchangeFacts;
  tabTeacherTips: Record<TabId, TabTeacherTip>;
}
