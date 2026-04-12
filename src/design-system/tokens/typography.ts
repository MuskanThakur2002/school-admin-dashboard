export const fontFamily = {
  display: ['Manrope', 'sans-serif'],
  body: ['Inter', 'sans-serif'],
} as const;

export const fontSize = {
  'display-lg': ['3.5rem', { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '700' }],
  'display-md': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
  'display-sm': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
  'headline-lg': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
  'headline-md': ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],
  'headline-sm': ['1.5rem', { lineHeight: '1.35', fontWeight: '600' }],
  'title-lg': ['1.375rem', { lineHeight: '1.4', fontWeight: '500' }],
  'title-md': ['1rem', { lineHeight: '1.5', fontWeight: '500', letterSpacing: '0.01em' }],
  'title-sm': ['0.875rem', { lineHeight: '1.45', fontWeight: '500', letterSpacing: '0.005em' }],
  'body-lg': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
  'body-md': ['0.875rem', { lineHeight: '1.55', fontWeight: '400' }],
  'body-sm': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],
  'label-lg': ['0.875rem', { lineHeight: '1.45', fontWeight: '500' }],
  'label-md': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
  'label-sm': ['0.6875rem', { lineHeight: '1.35', fontWeight: '500' }],
} as const;
