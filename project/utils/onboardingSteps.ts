import type { User } from '../services/authService';
import type { OnboardingProgress } from './labOnboarding';
import type { OnboardingRoute } from './authRouting';

export type OnboardingStepSlug =
  | 'demographics'
  | 'diabetic-path'
  | 'clinical-profile'
  | 'lab-choice'
  | 'lab-upload'
  | 'lab-review'
  | 'health-features';

const SLUG_TO_ROUTE: Record<OnboardingStepSlug, OnboardingRoute> = {
  demographics: '/onboarding/demographics',
  'diabetic-path': '/onboarding/diabetic-path',
  'clinical-profile': '/onboarding/clinical-profile',
  'lab-choice': '/onboarding/lab-choice',
  'lab-upload': '/onboarding/lab-upload',
  'lab-review': '/onboarding/lab-review',
  'health-features': '/onboarding/health-features',
};

export function slugToRoute(slug: OnboardingStepSlug): OnboardingRoute {
  return SLUG_TO_ROUTE[slug];
}

export function routeSegmentToSlug(segment: string | undefined): OnboardingStepSlug | null {
  if (!segment) return null;
  return segment in SLUG_TO_ROUTE ? (segment as OnboardingStepSlug) : null;
}

function demographicsDone(user: User | null, progress?: OnboardingProgress | null): boolean {
  if (progress?.demographics_done) return true;
  if (!user) return false;
  return (user.date_of_birth != null && user.date_of_birth !== '') || (user.age != null && user.age > 0);
}

function isStepComplete(
  slug: OnboardingStepSlug,
  user: User | null,
  progress?: OnboardingProgress | null
): boolean {
  switch (slug) {
    case 'demographics':
      return demographicsDone(user, progress);
    case 'diabetic-path':
      return user?.is_diabetic_path != null || progress?.diabetic_path_done === true;
    case 'clinical-profile':
      return user?.is_diabetic_path === false || progress?.clinical_profile_done === true;
    case 'lab-choice':
      return (progress?.lab_opt_in ?? user?.onboarding_lab_opt_in) != null;
    case 'lab-upload':
      return progress?.lab_upload_id != null;
    case 'lab-review':
      return progress?.lab_review_done ?? false;
    case 'health-features':
      return progress?.health_features_done ?? false;
    default:
      return false;
  }
}

/** Ordered steps for this user's path (based on choices made so far). */
export function buildOnboardingSteps(
  user: User | null,
  progress?: OnboardingProgress | null
): OnboardingStepSlug[] {
  const steps: OnboardingStepSlug[] = ['demographics', 'diabetic-path', 'lab-choice'];

  const labOptIn = progress?.lab_opt_in ?? user?.onboarding_lab_opt_in ?? null;
  if (labOptIn === true) {
    steps.push('lab-upload', 'lab-review');
  }

  steps.push('health-features');
  return steps;
}

export function getCanonicalStepIndex(
  user: User | null,
  progress?: OnboardingProgress | null
): number {
  const steps = buildOnboardingSteps(user, progress);
  for (let i = 0; i < steps.length; i++) {
    if (!isStepComplete(steps[i], user, progress)) return i;
  }
  return steps.length;
}

/** User may revisit any completed step or the current incomplete one. */
export function isOnboardingStepAllowed(
  user: User | null,
  progress: OnboardingProgress | null | undefined,
  slug: OnboardingStepSlug
): boolean {
  const steps = buildOnboardingSteps(user, progress);
  const currentIdx = steps.indexOf(slug);
  if (currentIdx === -1) return false;

  const canonicalIdx = getCanonicalStepIndex(user, progress);
  const maxAllowedIdx = Math.min(canonicalIdx, steps.length - 1);
  return currentIdx <= maxAllowedIdx;
}

export function getPreviousOnboardingRoute(
  user: User | null,
  progress: OnboardingProgress | null | undefined,
  slug: OnboardingStepSlug
): OnboardingRoute | null {
  const steps = buildOnboardingSteps(user, progress);
  const idx = steps.indexOf(slug);
  if (idx <= 0) return null;
  return slugToRoute(steps[idx - 1]);
}

export function getOnboardingStepInfo(
  user: User | null,
  progress: OnboardingProgress | null | undefined,
  slug: OnboardingStepSlug
): { step: number; total: number; percent: number; label: string } {
  const steps = buildOnboardingSteps(user, progress);
  const idx = steps.indexOf(slug);
  const step = idx >= 0 ? idx + 1 : 1;
  const total = steps.length;
  const percent = total > 0 ? (step / total) * 100 : 0;
  return {
    step,
    total,
    percent,
    label: `Step ${step} of ${total}`,
  };
}
