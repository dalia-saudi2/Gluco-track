/** Diabetes Care Hub — Candy palette (light + dark) */

export type DashboardPalette = {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  surfaceVariant: string;
  primary: string;
  primaryFixed: string;
  primaryContainer: string;
  onPrimary: string;
  secondary: string;
  secondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  tertiaryFixedDim: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  onTertiaryContainer: string;
  outlineVariant: string;
  error: string;
  green: string;
  orange: string;
  borderSubtle: string;
  borderMedium: string;
  topBarBg: string;
  overlay: string;
  scrim: string;
  cardBorder: string;
  accentBorder: {
    secondary: string;
    orange: string;
    primary: string;
    tertiary: string;
  };
};

export const D_LIGHT: DashboardPalette = {
  background: '#fef7ff',
  surface: '#ffffff',
  surfaceContainer: '#f8eef8',
  surfaceContainerLow: '#fbf2fb',
  surfaceContainerHigh: '#f2e8f2',
  surfaceVariant: '#f2e8f2',
  primary: '#e040a0',
  primaryFixed: '#ffd6ee',
  primaryContainer: '#f080c0',
  onPrimary: '#ffffff',
  secondary: '#7c52aa',
  secondaryContainer: '#eedcff',
  tertiary: '#0096cc',
  tertiaryContainer: '#40c0ee',
  tertiaryFixedDim: '#80d0f0',
  onBackground: '#2e1a28',
  onSurface: '#2e1a28',
  onSurfaceVariant: '#604868',
  onTertiaryContainer: '#00334d',
  outlineVariant: '#dcc8e0',
  error: '#e53e3e',
  green: '#16a34a',
  orange: '#ea580c',
  borderSubtle: 'rgba(220,200,224,0.35)',
  borderMedium: 'rgba(220,200,224,0.45)',
  topBarBg: 'rgba(255,255,255,0.7)',
  overlay: 'rgba(46,26,40,0.45)',
  scrim: 'rgba(46,26,40,0.4)',
  cardBorder: 'rgba(224, 64, 160, 0.06)',
  accentBorder: {
    secondary: 'rgba(124, 82, 170, 0.2)',
    orange: 'rgba(251, 146, 60, 0.25)',
    primary: 'rgba(224, 64, 160, 0.15)',
    tertiary: 'rgba(0, 150, 204, 0.2)',
  },
};

export const D_DARK: DashboardPalette = {
  background: '#140c14',
  surface: '#221822',
  surfaceContainer: '#2e2430',
  surfaceContainerLow: '#261e2a',
  surfaceContainerHigh: '#3a3040',
  surfaceVariant: '#3a3040',
  primary: '#f060b0',
  primaryFixed: '#4a2040',
  primaryContainer: '#b84888',
  onPrimary: '#ffffff',
  secondary: '#b088d8',
  secondaryContainer: '#3d2858',
  tertiary: '#48c0f0',
  tertiaryContainer: '#1a4a60',
  tertiaryFixedDim: '#2a6880',
  onBackground: '#f5eaf2',
  onSurface: '#f0e6ee',
  onSurfaceVariant: '#b8a4be',
  onTertiaryContainer: '#c8e8f8',
  outlineVariant: '#4a3850',
  error: '#f56565',
  green: '#4ade80',
  orange: '#fb923c',
  borderSubtle: 'rgba(180,150,190,0.15)',
  borderMedium: 'rgba(180,150,190,0.25)',
  topBarBg: 'rgba(34,24,34,0.92)',
  overlay: 'rgba(10,5,12,0.65)',
  scrim: 'rgba(10,5,12,0.55)',
  cardBorder: 'rgba(224, 64, 160, 0.12)',
  accentBorder: {
    secondary: 'rgba(176, 136, 216, 0.25)',
    orange: 'rgba(251, 146, 60, 0.3)',
    primary: 'rgba(240, 96, 176, 0.25)',
    tertiary: 'rgba(72, 192, 240, 0.25)',
  },
};

/** @deprecated Use useD() from hooks/useDashboardTheme for theme-aware colors */
export const D = D_LIGHT;

export const DF = {
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
} as const;

export function getDashboardPalette(theme: 'light' | 'dark'): DashboardPalette {
  return theme === 'dark' ? D_DARK : D_LIGHT;
}
