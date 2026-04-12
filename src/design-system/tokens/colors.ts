export const colors = {
  // Primary
  primary: '#002c98',
  primary_container: '#1a43bf',
  on_primary: '#ffffff',
  primary_fixed_dim: '#b8860b',

  // Secondary
  secondary: '#006970',
  secondary_container: '#004f54',
  secondary_fixed: '#8df2fc',
  on_secondary_fixed: '#002022',

  // Tertiary
  tertiary: '#790009',
  tertiary_container: '#930012',

  // Surface hierarchy (tonal layering)
  surface: '#faf8ff',
  surface_container_low: '#f2f3fd',
  surface_container_lowest: '#ffffff',
  surface_container: '#ecedf7',
  surface_container_high: '#e6e7f1',
  surface_container_highest: '#e1e2ec',
  background: '#faf8ff',

  // On-surface
  on_surface: '#191b22',
  on_surface_variant: '#444654',

  // Outline
  outline_variant: '#c4c5d6',

  // Status
  status_present: '#006970',
  status_absent: '#790009',
  status_late: '#b8860b',
} as const;

export type ColorToken = keyof typeof colors;
