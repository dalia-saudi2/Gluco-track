import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import type { DashboardPalette } from '../constants/DashboardColors';

export function createDashboardScreenTheme<T extends Record<string, unknown>>() {
  const Ctx = createContext<{ D: DashboardPalette; s: T } | null>(null);

  function useScreenTheme() {
    const value = useContext(Ctx);
    if (!value) {
      throw new Error('useScreenTheme must be used within a dashboard ScreenThemeProvider');
    }
    return value;
  }

  function ScreenThemeProvider({
    D,
    s,
    children,
  }: {
    D: DashboardPalette;
    s: T;
    children: ReactNode;
  }) {
    const value = useMemo(() => ({ D, s }), [D, s]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  }

  return { ScreenThemeProvider, useScreenTheme };
}
