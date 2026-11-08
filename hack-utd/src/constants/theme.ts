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
    gridLine: 'rgba(26, 95, 208, 0.08)',
    gridLineMajor: 'rgba(26, 95, 208, 0.16)',
    ticketBackground: '#E4ECF8',
  },
  dark: {
    text: '#EAF1FB',
    background: '#11264c',
    backgroundElement: '#233248',
    backgroundSelected: '#3769b0',
    textSecondary: '#93A3B8',
    border: '#fdfdfd9f',
    primary: '#95c910',
    primaryText: '#FFFFFF',
    primarySoft: '#18376c',
    danger: '#f54545',
    dangerSoft: '#3A1719',
    warning: '#F0B34A',
    warningSoft: '#3A2A10',
    success: '#3CCB8E',
    successSoft: '#0F3226',
    gridLine: 'rgba(255, 255, 255, 0.07)',
    gridLineMajor: 'rgba(255, 255, 255, 0.16)',
    ticketBackground: '#6883996b',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    heading: 'BlackOpsOne_400Regular',
    body: 'NewTegomin_400Regular',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    heading: 'BlackOpsOne_400Regular',
    body: 'NewTegomin_400Regular',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
    heading: 'BlackOpsOne_400Regular',
    body: 'NewTegomin_400Regular',
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
  md: 4,
  lg: 5,
  pill: 999,
} as const;

export const MaxContentWidth = 720;
