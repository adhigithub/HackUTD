import '@/global.css';

import { Platform } from 'react-native';

/**
 * BluePrint palette. Every key must exist in both light and dark.
 * Status colors (danger / warning / success) are used for alert severity.
 */
export const Colors = {
  light: {
    text: '#0B1B2E',
    background: '#F5F8FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3ECF7',
    textSecondary: '#5B6B80',
    border: '#D9E2EE',
    primary: '#1A5FD0',
    primaryText: '#FFFFFF',
    primarySoft: '#E3EDFC',
    danger: '#D93838',
    dangerSoft: '#FDECEC',
    warning: '#C27803',
    warningSoft: '#FEF4E2',
    success: '#16835A',
    successSoft: '#E5F5EE',
  },
  dark: {
    text: '#EAF1FB',
    background: '#08111E',
    backgroundElement: '#111D2E',
    backgroundSelected: '#1B2B42',
    textSecondary: '#93A3B8',
    border: '#22344D',
    primary: '#4C8DF6',
    primaryText: '#FFFFFF',
    primarySoft: '#14284A',
    danger: '#F26464',
    dangerSoft: '#3A1719',
    warning: '#F0B34A',
    warningSoft: '#3A2A10',
    success: '#3CCB8E',
    successSoft: '#0F3226',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const MaxContentWidth = 720;
