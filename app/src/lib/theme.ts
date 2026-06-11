// ─────────────────────────────────────────────────────────────────────────
// Pitch design system — "Fresh court"
// Clean consumer-app aesthetic: white surfaces, soft neutrals, one
// confident emerald accent, friendly rounded type. Instagram/Venmo DNA.
// ─────────────────────────────────────────────────────────────────────────

export const C = {
  // Backgrounds — airy and light
  bg: '#F7F8FA',          // app background (soft cool gray)
  bgDeep: '#FFFFFF',
  surface: '#FFFFFF',     // cards
  surface2: '#F1F3F6',    // raised/inset elements
  glass: '#F1F5F9',       // input fills, chips

  // Brand — vibrant emerald
  greenDeep: '#047857',
  green: '#10B981',       // primary actions
  greenSoft: '#059669',   // links, accents (dark enough for white bg)
  lime: '#A3E635',
  greenLight: '#D1FAE5',  // chip backgrounds
  greenUltra: '#ECFDF5',  // subtle tints

  // Text
  ink: '#0F172A',
  inkSoft: '#334155',
  muted: '#64748B',
  subtle: '#94A3B8',

  // Borders
  separator: 'rgba(15,23,42,0.06)',
  border: 'rgba(15,23,42,0.10)',
  borderGlow: 'rgba(16,185,129,0.4)',

  // Status badges — soft tinted pills
  openBg: '#D1FAE5',
  openText: '#047857',
  closedBg: '#FEF3C7',
  closedText: '#92400E',
  completedBg: '#E0E7FF',
  completedText: '#4338CA',
  cancelledBg: '#FFE4E6',
  cancelledText: '#BE123C',

  // Semantic
  red: '#E11D48',
  redLight: '#FFF1F2',
  redBorder: '#FECDD3',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  amberBorder: '#FDE68A',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoBorder: '#C7D2FE',

  // Gradients (use with expo-linear-gradient)
  gradGreen: ['#34D399', '#059669'] as const,
  gradHero: ['#10B981', '#A3E635'] as const,
  gradCard: ['#ECFDF5', '#FFFFFF'] as const,

  // Typography — friendly, rounded, confident
  fontDisplay: 'PlusJakartaSans_800ExtraBold',
  fontDisplayMed: 'PlusJakartaSans_600SemiBold',

  // Radii
  rSm: 10,
  rMd: 14,
  rLg: 20,
  rXl: 26,
  rFull: 999,

  // Shadows — feather-soft, iOS-like
  shadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  shadowMd: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  glow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  glowSoft: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
} as const;
