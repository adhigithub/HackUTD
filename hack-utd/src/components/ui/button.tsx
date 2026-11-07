import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  size?: 'md' | 'sm';
};

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  size = 'md',
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: theme.primaryText, border: theme.primary },
    secondary: { bg: theme.backgroundElement, fg: theme.text, border: theme.border },
    danger: { bg: theme.dangerSoft, fg: theme.danger, border: theme.dangerSoft },
    ghost: { bg: 'transparent', fg: theme.primary, border: 'transparent' },
  }[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: palette.bg, borderColor: palette.border },
        state.pressed && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: palette.fg }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { minHeight: 36, paddingHorizontal: Spacing.three, borderRadius: Radius.sm },
  label: { fontSize: 16, fontWeight: 600 },
  labelSm: { fontSize: 14 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});
