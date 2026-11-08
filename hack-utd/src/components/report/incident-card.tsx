import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, formatUSD } from '@/lib/portfolio/format';
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

type StepState = 'happening' | 'stopped' | 'prevented';

function StepDot({ state, inline }: { state: StepState; inline?: boolean }) {
  const theme = useTheme();
  const color = state === 'stopped' ? theme.success : state === 'happening' ? theme.warning : theme.border;
  return (
    <View
      style={[
        styles.dot,
        inline && styles.dotInline,
        { borderColor: color, backgroundColor: state === 'prevented' ? 'transparent' : color },
      ]}
    />
  );
}

/** Explains the dots used in every domino chain. Shown once above the list. */
export function ChainLegend() {
  const items: { state: StepState; label: string }[] = [
    { state: 'happening', label: 'Already going wrong' },
    { state: 'stopped', label: 'Where we stopped it' },
    { state: 'prevented', label: 'Never happened' },
  ];
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.state} style={styles.legendItem}>
          <StepDot state={i.state} inline />
          <ThemedText type="small" themeColor="textSecondary">
            {i.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

/** A problem that was stopped: what it was, how it would have spread, and how it was fixed. */
export function IncidentCard({ incident }: { incident: ResolvedIncident }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const mode = MODE_COLORS[incident.fixMode];

  return (
    <Card style={styles.card}>
      {/* What + how much */}
      <View style={styles.top}>
        <View style={styles.flex}>
          <ThemedText type="smallBold" style={styles.title}>
            {incident.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {buildingName(incident.buildingId)} · {formatShortDate(incident.occurredAt)}
          </ThemedText>
        </View>
        <View style={styles.saved}>
          <ThemedText type="smallBold" themeColor="success" style={styles.amount}>
            {formatUSD(incident.costAvoided)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            saved
          </ThemedText>
        </View>
      </View>

      {/* The domino chain */}
      <View
        style={[styles.chain, { backgroundColor: theme.background }]}
        accessible
        accessibilityLabel={`How it would have spread: ${incident.chain.join(', then ')}. Stopped at: ${incident.chain[incident.stoppedAt]}.`}>
        {incident.chain.map((step, i) => {
          const state: StepState = i === incident.stoppedAt ? 'stopped' : i < incident.stoppedAt ? 'happening' : 'prevented';
          return (
            <View key={step} style={styles.stepRow}>
              <View style={styles.rail}>
                <StepDot state={state} />
                {i < incident.chain.length - 1 ? (
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                ) : null}
              </View>
              <View style={styles.stepText}>
                <ThemedText
                  type={state === 'stopped' ? 'smallBold' : 'small'}
                  themeColor={state === 'prevented' ? 'textSecondary' : state === 'stopped' ? 'success' : 'text'}
                  style={state === 'prevented' && styles.prevented}>
                  {step}
                </ThemedText>
                {state === 'stopped' ? (
                  <ThemedText type="small" themeColor="success" style={styles.stopNote}>
                    ← stopped here
                  </ThemedText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {/* The fix */}
      <View style={styles.fix}>
        <Pill label={FIX_MODE_LABELS[incident.fixMode]} fg={mode.fg} bg={mode.bg} />
        <ThemedText type="small">{incident.fix}</ThemedText>
      </View>

      {/* Details on demand */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        hitSlop={8}
        style={[styles.toggle, { borderTopColor: theme.border }]}>
        <ThemedText type="smallBold" themeColor="primary">
          {open ? 'Hide details' : 'What the data showed'}
        </ThemedText>
      </Pressable>
      {open ? (
        <View style={styles.details}>
          <ThemedText type="small" themeColor="textSecondary">
            {incident.summary}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            <ThemedText type="smallBold" themeColor="textSecondary">
              Data we connected:{' '}
            </ThemedText>
            {incident.sources.join(', ')}
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: Spacing.three, padding: Spacing.three },
  top: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  title: { fontSize: 17, lineHeight: 23 },
  saved: { alignItems: 'flex-end' },
  amount: { fontSize: 17, lineHeight: 23, fontVariant: ['tabular-nums'] },
  chain: { borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  stepRow: { flexDirection: 'row', gap: Spacing.three },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 4 },
  dotInline: { marginTop: 0 },
  line: { width: 2, flex: 1, minHeight: 10, marginVertical: 2 },
  stepText: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.two, paddingBottom: Spacing.two },
  prevented: { textDecorationLine: 'line-through' },
  stopNote: { fontSize: 13 },
  fix: { gap: Spacing.two, alignItems: 'flex-start' },
  toggle: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two },
  details: { gap: Spacing.two },
  pill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two + 2, paddingVertical: 3 },
  pillText: { fontSize: 12, lineHeight: 16 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.one },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
});
