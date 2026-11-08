import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatUSD } from '@/lib/portfolio/format';
import { buildingName } from '@/lib/portfolio/report';
import { FIX_MODE_LABELS, type FixMode, type ResolvedIncident } from '@/lib/portfolio/types';

const MODE_COLORS: Record<FixMode, { fg: ThemeColor; bg: ThemeColor }> = {
  auto: { fg: 'success', bg: 'successSoft' },
  one_tap: { fg: 'primary', bg: 'primarySoft' },
  escalated: { fg: 'warning', bg: 'warningSoft' },
};

export function Pill({ label, fg, bg }: { label: string; fg: ThemeColor; bg: ThemeColor }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme[bg] }]}>
      <ThemedText type="smallBold" style={[styles.pillText, { color: theme[fg] }]}>
        {label}
      </ThemedText>
    </View>
  );
}

/** A problem that was stopped, with its domino chain and where it was stopped. */
export function IncidentCard({ incident }: { incident: ResolvedIncident }) {
  const theme = useTheme();
  const mode = MODE_COLORS[incident.fixMode];

  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            {buildingName(incident.buildingId)} · {formatDateTime(incident.occurredAt)}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.title}>
            {incident.title}
          </ThemedText>
        </View>
        <View style={styles.saved}>
          <ThemedText type="smallBold" themeColor="success" style={styles.num}>
            {formatUSD(incident.costAvoided)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            avoided
          </ThemedText>
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {incident.summary}
      </ThemedText>

      {/* Domino chain: everything after the stopped domino stayed standing. */}
      <View
        style={styles.chain}
        accessible
        accessibilityLabel={`Chain: ${incident.chain.join(', then ')}. Stopped at ${incident.chain[incident.stoppedAt]}.`}>
        {incident.chain.map((step, i) => {
          const stopped = i === incident.stoppedAt;
          const prevented = i > incident.stoppedAt;
          return (
            <View key={step} style={styles.step}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: stopped ? theme.success : prevented ? 'transparent' : theme.warning,
                    borderColor: stopped ? theme.success : prevented ? theme.border : theme.warning,
                  },
                ]}
              />
              <ThemedText
                type="small"
                themeColor={prevented ? 'textSecondary' : 'text'}
                style={[styles.flex, prevented && styles.prevented]}>
                {step}
              </ThemedText>
              {stopped ? (
                <ThemedText type="smallBold" themeColor="success" style={styles.stopLabel}>
                  Stopped here
                </ThemedText>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.fix, { borderTopColor: theme.border }]}>
        <Pill label={FIX_MODE_LABELS[incident.fixMode]} fg={mode.fg} bg={mode.bg} />
        <ThemedText type="small" style={styles.flex}>
          {incident.fix}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', gap: Spacing.two },
  title: { fontSize: 16, lineHeight: 22 },
  saved: { alignItems: 'flex-end' },
  num: { fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'] },
  chain: { gap: Spacing.one, paddingVertical: Spacing.one },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  prevented: { textDecorationLine: 'line-through' },
  stopLabel: { fontSize: 12, lineHeight: 16 },
  fix: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  pill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  pillText: { fontSize: 12, lineHeight: 16 },
});
