import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SourceChip } from '@/components/alerts/pill';
import { Timeline } from '@/components/alerts/timeline';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAlerts } from '@/features/alerts/alerts-context';
import { lostAt } from '@/features/alerts/engine';
import { formatMinutes, formatUSD } from '@/features/alerts/format';
import { getBuilding } from '@/features/alerts/mock-data';
import type { Alert } from '@/features/alerts/types';
import { useSimClock } from '@/features/alerts/use-sim-clock';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAlert, status } = useAlerts();
  const alert = getAlert(id);

  if (!alert) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ThemedText themeColor="textSecondary">
          {status === 'scanning' ? 'Loading…' : 'This alert is no longer active.'}
        </ThemedText>
      </Screen>
    );
  }
  return <AlertDetail key={`${alert.id}-${alert.detectedAt}`} alert={alert} />;
}

function AlertDetail({ alert }: { alert: Alert }) {
  const theme = useTheme();
  const { resolutions } = useAlerts();
  const resolution = resolutions[alert.id];
  const chain = alert.chain;

  const fix = resolution
    ? alert.fixes.find((f) => f.id === resolution.fixId)
    : alert.fixes.find((f) => f.feasible);
  const fixIndex = fix ? chain.findIndex((d) => d.id === fix.stopsAtDominoId) : null;
  const projectedLoss = alert.costAtRisk;
  const lossWithFix = fix ? projectedLoss - fix.saved : projectedLoss;

  const sim = useSimClock(chain[chain.length - 1].fallAtMin);
  const lostSoFar = lostAt(chain, sim.simMin, null);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ThemedText type="small" themeColor="textSecondary">
        {getBuilding(alert.buildingId)?.name}
      </ThemedText>

      {/* PROBLEM + projected loss */}
      <Card style={styles.block}>
        <ThemedText type="smallBold" themeColor="danger">
          PROBLEM
        </ThemedText>
        <ThemedText style={styles.sentence}>
          {alert.asset} in {alert.location} will break down in about{' '}
          {formatMinutes(chain[0].fallAtMin)}.
        </ThemedText>
        <View style={[styles.money, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger">
            Projected loss if ignored
          </ThemedText>
          <ThemedText style={[styles.amount, { color: theme.danger }]}>
            {formatUSD(projectedLoss)}
          </ThemedText>
        </View>
      </Card>

      {/* FIX + savings */}
      {fix && (
        <Card style={styles.block}>
          <ThemedText type="smallBold" themeColor="success">
            FIX
          </ThemedText>
          <ThemedText style={styles.sentence}>{fix.title}.</ThemedText>
          <View style={[styles.money, { backgroundColor: theme.successSoft }]}>
            <ThemedText type="small" themeColor="success">
              {resolution ? 'Saved' : 'Saves'}
            </ThemedText>
            <ThemedText style={[styles.amount, { color: theme.success }]}>
              {formatUSD(fix.saved)}
            </ThemedText>
            {lossWithFix > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                You’d still lose {formatUSD(lossWithFix)} ({chain.slice(0, fixIndex ?? 0).map((d) => d.label).join(', ')}).
              </ThemedText>
            )}
          </View>
        </Card>
      )}

      {resolution ? (
        <View style={[styles.done, { backgroundColor: theme.successSoft }]}>
          <ThemedText type="smallBold" themeColor="success">
            ✓ Fixed by {resolution.byName}
          </ThemedText>
        </View>
      ) : fix ? (
        <Button
          title="Fix it"
          onPress={() => router.push({ pathname: '/alerts/[id]/fix', params: { id: alert.id } })}
        />
      ) : (
        <ThemedText themeColor="danger">No fix can land in time. Call the on-site team now.</ThemedText>
      )}

      {/* Small timeline + simulation */}
      <Card style={styles.block}>
        <View style={styles.header}>
          <ThemedText type="smallBold" style={styles.flex}>
            {resolution ? 'What the fix prevented' : 'If we wait…'}
          </ThemedText>
          {!resolution && (
            <Button
              title={sim.playing ? 'Pause' : sim.finished ? 'Replay' : sim.started ? 'Resume' : '▶ Simulate'}
              size="sm"
              variant="secondary"
              onPress={sim.playing ? sim.pause : sim.finished ? sim.reset : sim.play}
            />
          )}
        </View>

        {sim.started && !resolution && (
          <View style={styles.simBar}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatMinutes(sim.simMin)} from now
            </ThemedText>
            <ThemedText type="smallBold" themeColor="danger">
              Lost so far: {formatUSD(lostSoFar)}
            </ThemedText>
          </View>
        )}

        <Timeline chain={chain} simMin={sim.simMin} fixIndex={fixIndex} fixed={!!resolution} />

        {sim.finished && !resolution && fix && (
          <ThemedText type="small" themeColor="success">
            With the fix, the loss drops from {formatUSD(projectedLoss)} to {formatUSD(lossWithFix)}.
          </ThemedText>
        )}
      </Card>

      {/* Where the data comes from */}
      <Card style={styles.block}>
        <ThemedText type="smallBold">How we know</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          BluePrint combined {alert.signals.length} building systems to spot this:
        </ThemedText>
        {alert.signals.map((s) => (
          <View key={s.reading} style={styles.signal}>
            <SourceChip source={s.source} />
            <ThemedText type="small">{s.reading}</ThemedText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { padding: Spacing.four, gap: Spacing.two },
  sentence: { fontSize: 20, lineHeight: 28, fontWeight: 600 },
  money: { borderRadius: Radius.md, padding: Spacing.three, gap: 2 },
  amount: { fontSize: 26, lineHeight: 32, fontWeight: 800 },
  done: { padding: Spacing.three, borderRadius: Radius.md, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  simBar: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two },
  signal: { gap: Spacing.one, paddingTop: Spacing.one },
});
