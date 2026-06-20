/**
 * Global polyfills for React Native / Hermes JS engine
 * This file must be imported FIRST in app/_layout.tsx
 */

// structuredClone — not available in Hermes (used by the 'ai' SDK internally)
if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as any).structuredClone = function structuredClone<T>(obj: T): T {
    if (obj === undefined) return obj;
    return JSON.parse(JSON.stringify(obj));
  };
}
