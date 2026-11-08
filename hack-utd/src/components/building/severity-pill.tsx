import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Severity } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';

type Theme = ReturnType<typeof useTheme>;

/** Red for critical/high, orange for medium, green for low. */
export function severityColors(severity: Severity, theme: Theme) {
  switch (severity) {
    case 'critical':
    case 'high':
      return { fg: theme.danger, bg: theme.dangerSoft };
    case 'medium':
      return { fg: theme.warning, bg: theme.warningSoft };
    default:
      return { fg: theme.success, bg: theme.successSoft };
  }
}

/** Everyday words for how serious something is. */
export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Urgent',
  high: 'Serious',
  medium: 'Worth a look',
  low: 'Minor',
};

/** Small colored label like "URGENT". */
export function SeverityPill({ severity }: { severity: Severity }) {
  const theme = useTheme();
  const { fg, bg } = severityColors(severity, theme);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <ThemedText type="smallBold" style={[styles.label, { color: fg }]}>
        {SEVERITY_LABELS[severity].toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
});
