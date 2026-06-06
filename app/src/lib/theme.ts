export const C = {
  // Background — warm sage (not generic iOS cold gray)
  bg: '#f1f4f1',
  surface: '#ffffff',

  // Brand — two-level green for hierarchy
  greenDeep: '#14532d',   // header backgrounds, logo
  green: '#16a34a',       // buttons, active states
  greenLight: '#dcfce7',  // chip backgrounds
  greenUltra: '#f0fdf4',  // card tints

  // Text — neutral dark for clean readability
  ink: '#111827',
  inkSoft: '#374151',
  muted: '#6b7280',
  subtle: '#9ca3af',

  // Borders
  separator: 'rgba(0,0,0,0.07)',
  border: 'rgba(0,0,0,0.1)',

  // Status — vivid & distinct (no washed-out pastels)
  // Open  → solid green badge
  openBg: '#16a34a',
  openText: '#ffffff',

  // Closed → bold amber
  closedBg: '#fef3c7',
  closedText: '#92400e',

  // Completed → vivid indigo
  completedBg: '#e0e7ff',
  completedText: '#3730a3',

  // Cancelled → vivid rose
  cancelledBg: '#ffe4e6',
  cancelledText: '#9f1239',

  // Semantic colours (used for alerts, player rows, etc.)
  red: '#e11d48',
  redLight: '#fff1f2',
  redBorder: '#fecdd3',
  amber: '#d97706',
  amberLight: '#fffbeb',
  amberBorder: '#fde68a',
  indigo: '#4f46e5',
  indigoLight: '#eef2ff',
  indigoBorder: '#c7d2fe',

  // Radii
  rSm: 10,
  rMd: 14,
  rLg: 18,
  rXl: 24,
  rFull: 999,

  // Shadows
  shadow: {
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  shadowMd: {
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
