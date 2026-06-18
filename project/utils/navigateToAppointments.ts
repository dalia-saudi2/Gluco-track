import type { Router } from 'expo-router';

export const APPOINTMENTS_ROUTE = '/(tabs)/appointments' as const;
export const APPOINTMENTS_BOOK_PARAM = 'book' as const;

/** True when a button label should open the appointments tab to book. */
export function isBookActionLabel(label: string): boolean {
  const t = label.trim().toLowerCase();
  return (
    t === 'book' ||
    t === 'book now' ||
    t.includes('book ') ||
    t.startsWith('book') ||
    t === 'schedule' ||
    t === 'rebook' ||
    t === 'rebook now' ||
    t.includes('schedule new') ||
    t.includes('new appointment')
  );
}

export function appointmentsBookHref(): string {
  return `${APPOINTMENTS_ROUTE}?${APPOINTMENTS_BOOK_PARAM}=1`;
}

export function navigateToAppointments(router: Pick<Router, 'push'>): void {
  router.push(APPOINTMENTS_ROUTE as never);
}

/** Opens the appointments tab and starts the booking flow. */
export function navigateToBookAppointment(router: Pick<Router, 'push'>): void {
  router.push(appointmentsBookHref() as never);
}

export function navigateForActionLabel(
  router: Pick<Router, 'push'>,
  label: string,
): void {
  if (isBookActionLabel(label)) {
    navigateToBookAppointment(router);
    return;
  }
  navigateToAppointments(router);
}
