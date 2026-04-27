export const colors = {
  bg: {
    primary:  '#0A0A0A',
    secondary:'#141414',
    card:     '#1C1C1C',
    elevated: '#242424',
    input:    '#1E1E1E',
  },
  accent: {
    primary:  '#FF4500',
    secondary:'#FF6B35',
    success:  '#22C55E',
    warning:  '#FACC15',
    danger:   '#EF4444',
    info:     '#3B82F6',
  },
  text: {
    primary:  '#FFFFFF',
    secondary:'#A1A1A1',
    muted:    '#525252',
    inverse:  '#0A0A0A',
  },
  border: '#2A2A2A',
  borderLight: '#3A3A3A',
  overlay: 'rgba(0,0,0,0.7)',
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const radius = {
  sm:   6,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const typography = {
  h1:        { fontSize: 32, fontWeight: '700' as const, color: '#FFFFFF', lineHeight: 40 },
  h2:        { fontSize: 26, fontWeight: '700' as const, color: '#FFFFFF', lineHeight: 34 },
  h3:        { fontSize: 20, fontWeight: '600' as const, color: '#FFFFFF', lineHeight: 28 },
  h4:        { fontSize: 17, fontWeight: '600' as const, color: '#FFFFFF', lineHeight: 24 },
  body:      { fontSize: 16, fontWeight: '400' as const, color: '#FFFFFF', lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, color: '#A1A1A1', lineHeight: 20 },
  caption:   { fontSize: 13, fontWeight: '400' as const, color: '#A1A1A1', lineHeight: 18 },
  label:     { fontSize: 11, fontWeight: '600' as const, color: '#A1A1A1', letterSpacing: 1.2, lineHeight: 16 },
  mono:      { fontSize: 14, fontFamily: 'monospace' as const, color: '#FFFFFF' },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
