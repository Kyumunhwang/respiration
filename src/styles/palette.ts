/**
 * Standardized color palette for the Grade 8 Respiration Simulation ([9과11-03]).
 * Shared across anatomical SVGs, microscopic gallery illustrations, and UI visuals.
 */
export const RESPIRATION_PALETTE = {
  inhale: '#00B4D8',
  inhaleLight: '#E0F7FA',
  exhale: '#F4A261',
  exhaleLight: '#FFF3E6',
  arterialRed: '#EF4444',
  venousDark: '#7F1D1D',
  ribBone: '#CBD5E1',
  cartilage: '#94A3B8',
  lungTissue: '#FDA4AF',
  lungInner: '#FECDD3',
  diaphragm: '#E11D48',
  thoraxBg: '#F1F5F9',
} as const;

export type RespirationPalette = typeof RESPIRATION_PALETTE;
