/**
 * Design System: Color Palette
 * This file defines the visual language of the app.
 * It contains two primary palettes: Light Mode and Dark Mode.
 */
export const Colors = {
    light: {
        // Backgrounds
        background: '#F8FAFC',
        card: '#FFFFFF',
        surface: '#F1F5F9',

        // Primary colors
        primary: '#1E3A8A',
        primaryLight: '#EEF2FF',
        primaryBorder: '#C7D2FE',

        // Text colors
        text: '#1E293B',
        textSecondary: '#64748B',
        textTertiary: '#94A3B8',

        // Border colors
        border: '#E2E8F0',
        borderLight: '#F1F5F9',

        // Status colors
        success: '#10B981',
        successLight: '#D1FAE5',
        successBorder: '#A7F3D0',

        error: '#DC2626',
        errorLight: '#FEE2E2',
        errorBorder: '#FCA5A5',

        warning: '#F59E0B',
        warningLight: '#FEF3C7',
        warningBorder: '#FCD34D',

        info: '#3B82F6',
        infoLight: '#DBEAFE',
        infoBorder: '#93C5FD',

        // UI elements
        shadow: '#000000',
        overlay: 'rgba(15, 23, 42, 0.5)',
        disabled: '#E2E8F0',

        // Specific UI
        headerBg: '#FFFFFF',
        tabActive: '#1E3A8A',
        tabInactive: '#64748B',
    },

    /**
     * DARK MODE PALETTE
     * Optimized for low-light environments and OLED screens.
     * Uses deep slate and blue tones to reduce eye strain.
     */
    dark: {
        // Backgrounds
        background: '#0F172A',
        card: '#1E293B',
        surface: '#334155',

        // Primary colors
        primary: '#3B82F6',
        primaryLight: '#1E3A8A',
        primaryBorder: '#1E40AF',

        // Text colors
        text: '#F1F5F9',
        textSecondary: '#94A3B8',
        textTertiary: '#64748B',

        // Border colors
        border: '#334155',
        borderLight: '#475569',

        // Status colors
        success: '#10B981',
        successLight: '#064E3B',
        successBorder: '#065F46',

        error: '#EF4444',
        errorLight: '#7F1D1D',
        errorBorder: '#991B1B',

        warning: '#F59E0B',
        warningLight: '#78350F',
        warningBorder: '#92400E',

        info: '#3B82F6',
        infoLight: '#1E3A8A',
        infoBorder: '#1E40AF',

        // UI elements
        shadow: '#000000',
        overlay: 'rgba(0, 0, 0, 0.7)',
        disabled: '#475569',

        // Specific UI
        headerBg: '#1E293B',
        tabActive: '#3B82F6',
        tabInactive: '#94A3B8',
    },
};

export type ColorScheme = typeof Colors.light;
