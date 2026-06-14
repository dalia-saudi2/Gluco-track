import React from 'react';
import { Pressable } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useDashboardTheme } from '../../hooks/useDashboardTheme';

export function ThemeToggleButton() {
  const { theme, D, toggleTheme } = useDashboardTheme();
  const isDark = theme === 'dark';

  return (
    <Pressable
      style={{
        padding: 8,
        borderRadius: 999,
        backgroundColor: D.surfaceContainerLow,
        borderWidth: 1,
        borderColor: D.borderSubtle,
      }}
      onPress={toggleTheme}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      accessibilityRole="button"
    >
      {isDark ? (
        <Sun size={20} color={D.orange} />
      ) : (
        <Moon size={20} color={D.secondary} />
      )}
    </Pressable>
  );
}
