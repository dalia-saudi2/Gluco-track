/** Material Design 3 palette from onboarding HTML (Stitch) */
export const OnboardingColors = {
  background: '#fff9fc',
  surface: '#fff9fc',
  surfaceBright: '#fff9fc',
  surfaceDim: '#f8e6f0',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#fff1f7',
  surfaceContainer: '#f8eaf1',
  surfaceContainerHigh: '#fce8f2',
  surfaceContainerHighest: '#f2dde7',
  surfaceVariant: '#f4dee9',
  primary: '#e040a0',
  primaryContainer: '#e040a0',
  primaryFixed: '#ffd8ec',
  primaryFixedDim: '#ffafd4',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#ffffff',
  onPrimaryFixed: '#3d0025',
  secondary: '#7c4dff',
  onSurface: '#201a1d',
  onBackground: '#201a1d',
  onSurfaceVariant: '#53434a',
  outline: '#85737c',
  outlineVariant: '#d8c2cc',
  cardBorder: '#f8eaf1',
  cardShadow: 'rgba(224, 64, 160, 0.08)',
  sliderTrack: '#f2dde7',
  sliderThumbShadow: 'rgba(224, 64, 160, 0.3)',
  buttonShadow: 'rgba(224, 64, 160, 0.3)',
};

export const OnboardingTypography = {
  headlineLgMobile: { fontSize: 26, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.26 },
  headlineLg: { fontSize: 32, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.64 },
  bodyMd: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  bodyLg: { fontSize: 18, lineHeight: 28, fontWeight: '700' as const },
  labelSm: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const },
  labelMd: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const, letterSpacing: 0.14 },
  sliderTick: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5 },
};

export const EDUCATION_LEVELS = [
  'No High School',
  'High School Diploma',
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate / Professional',
] as const;

export const ETHNICITY_OPTIONS = ['Asian', 'Black', 'Hispanic', 'White', 'Other'] as const;

export const EMPLOYMENT_OPTIONS = ['Employed', 'Unemployed', 'Student', 'Retired'] as const;

export const INCOME_OPTIONS = ['Under 25k', '25k-50k', '50k-100k', '100k+'] as const;

export const GENDER_OPTIONS = ['Male', 'Female'] as const;
