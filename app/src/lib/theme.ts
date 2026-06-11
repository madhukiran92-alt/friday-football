// ─────────────────────────────────────────────────────────────────────────
// Pitch design system — "Night match"
// Deep green-black stadium palette, floodlight glows, lime accents.
// Matches the pitchapp.net brand.
// ─────────────────────────────────────────────────────────────────────────

export const C = {
  // Backgrounds — green-tinted near-black, layered
  bg: '#070d09',          // app background
  bgDeep: '#040805',      // tab bar / deepest layer
  surface: '#101a13',     // cards
  surface2: '#16221a',    // raised elements on cards
  glass: 'rgba(255,255,255,0.05)',

  // Brand greens
  greenDeep: '#14532d',
  green: '#22c55e',       // primary actions
  greenSoft: '#4ade80',   // accents, links, glow color
  lime: '#a3e635',
  greenLight: 'rgba(74,222,128,0.14)',  // chip backgrounds
  greenUltra: 'rgba(74,222,128,0.08)',  // subtle tints

  // Text — light on dark
  ink: '#f2f7f3',         // headings
  inkSoft: '#cdd9d0',     // body
  muted: '#8da396',       // secondary
  subtle: '#5c6f62',      // tertiary / placeholders

  // Borders
  separator: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.10)',
  borderGlow: 'rgba(74,222,128,0.35)',

  // Status badges — translucent fills, vivid text
  openBg: 'rgba(34,197,94,0.18)',
  openText: '#4ade80',
  closedBg: 'rgba(245,158,11,0.16)',
  closedText: '#fbbf24',
  completedBg: 'rgba(129,140,248,0.16)',
  completedText: '#a5b4fc',
  cancelledBg: 'rgba(244,63,94,0.14)',
  cancelledText: '#fda4af',

  // Semantic
  red: '#fb7185',
  redLight: 'rgba(244,63,94,0.12)',
  redBorder: 'rgba(244,63,94,0.35)',
  amber: '#fbbf24',
  amberLight: 'rgba(245,158,11,0.12)',
  amberBorder: 'rgba(245,158,11,0.35)',
  indigo: '#a5b4fc',
  indigoLight: 'rgba(129,140,248,0.12)',
  indigoBorder: 'rgba(129,140,248,0.35)',

  // Gradients (use with expo-linear-gradient)
  gradGreen: ['#22c55e', '#15803d'] as const,
  gradHero: ['#4ade80', '#a3e635'] as const,
  gradCard: ['rgba(74,222,128,0.12)', 'rgba(74,222,128,0.02)'] as const,

  // Typography
  fontDisplay: 'SpaceGrotesk_700Bold',
  fontDisplayMed: 'SpaceGrotesk_500Medium',

  // Radii
  rSm: 10,
  rMd: 14,
  rLg: 20,
  rXl: 26,
  rFull: 999,

  // Shadows — green glow on dark
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
  },
  shadowMd: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 8,
  },
  glow: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  glowSoft: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
