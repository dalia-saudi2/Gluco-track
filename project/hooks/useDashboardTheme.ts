import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { DashboardPalette } from '../constants/DashboardColors';
import { DF } from '../constants/DashboardColors';

export function useD(): DashboardPalette {
  return useTheme().dashboard;
}

export function useDashboardTheme() {
  const { theme, dashboard, toggleTheme, setTheme } = useTheme();
  return { theme, D: dashboard, DF, toggleTheme, setTheme };
}

export function useDashboardStyles<T extends Record<string, unknown>>(
  factory: (D: DashboardPalette) => T
): T {
  const D = useD();
  return useMemo(() => StyleSheet.create(factory(D) as T), [D]);
}
