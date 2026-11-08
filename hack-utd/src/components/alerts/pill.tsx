import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Severity, SourceSystem } from '@/features/alerts/types';
import { SOURCE_LABELS } from '@/features/alerts/types';

export type Tone = 'danger' | 'warning' | 'success' | 'primary' | 'neutral';

export function useTone(tone: Tone) {
  const t = useTheme();
  return {
    danger: { fg: t.danger, bg: t.dangerSoft },
    warning: { fg: t.warning, bg: t.warningSoft },
    success: { fg: t.success, bg: t.successSoft },
    primary: { fg: t.primary, bg: t.primarySoft },
    neutral: { fg: t.textSecondary, bg: t.backgroundSelected },
  }[tone];
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const c = useTone(tone);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <ThemedText style={[styles.text, { color: c.fg }]}>{label}</ThemedText>
    </View>
  );
}

export function SeverityPill({ severity, resolved }: { severity: Severity; resolved?: boolean }) {
  if (resolved) return <Pill label="✓ Stopped" tone="success" />;
  return severity === 'act' ? (
    <Pill label="● Act now" tone="danger" />
  ) : (
    <Pill label="● Watch" tone="warning" />
  );
}

/** Shows which building system a piece of data came from. */
export function SourceChip({ source }: { source: SourceSystem }) {
  return <Pill label={SOURCE_LABELS[source]} tone="primary" />;
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  text: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
});
