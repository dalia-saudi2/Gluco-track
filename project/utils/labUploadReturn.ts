import type { Router } from 'expo-router';

/** Where to return after opening lab OCR from tabs/profile (not pure onboarding). */
let returnRoute: string | null = null;

/** After exiting a tab-originated flow, allow (tabs) even if onboarding flag was stale. */
let allowTabsDespiteOnboarding = false;

export function normalizeAppReturnRoute(route: string): string {
  if (!route || route === '/' || route === '/index') return '/(tabs)';
  return route;
}

export function setLabUploadReturnTo(route: string) {
  returnRoute = normalizeAppReturnRoute(route);
}

export function peekLabUploadReturnTo(): string | null {
  return returnRoute;
}

export function consumeLabUploadReturnTo(fallback = '/(tabs)'): string {
  const route = returnRoute ?? fallback;
  returnRoute = null;
  return normalizeAppReturnRoute(route);
}

export function clearLabUploadReturnTo() {
  returnRoute = null;
}

export function markTabsReturnAfterFlowExit() {
  allowTabsDespiteOnboarding = true;
}

export function peekTabsReturnAfterFlowExit(): boolean {
  return allowTabsDespiteOnboarding;
}

function isTabsRoute(route: string): boolean {
  const normalized = normalizeAppReturnRoute(route);
  return normalized === '/(tabs)' || normalized.startsWith('/(tabs)/');
}

/** Clear tab-bypass flag and any stale onboarding/profile return routes. */
export function clearTabsReturnAfterFlowExit() {
  allowTabsDespiteOnboarding = false;
  if (returnRoute && !isTabsRoute(returnRoute)) {
    returnRoute = null;
  }
}

/** Leave lab upload/review and return to the screen that opened the flow, if any. */
export function exitLabUploadFlow(router: Router, fallback = '/(tabs)'): boolean {
  if (!returnRoute) return false;
  const route = consumeLabUploadReturnTo(fallback);
  if (isTabsRoute(route)) {
    markTabsReturnAfterFlowExit();
  }
  router.replace(route as never);
  return true;
}
