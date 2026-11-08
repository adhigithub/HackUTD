import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAlerts } from '@/features/alerts/alerts-context';
import { formatMinutes, formatUSD, formatUSDCompact } from '@/features/alerts/format';
import { draftWorkOrder } from '@/features/alerts/mock-ai';
import type { Alert, ScoredFix } from '@/features/alerts/types';
import { useAuth } from '@/lib/auth/auth-context';
import { can, type User } from '@/lib/auth/types';

export default function FixPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAlert, resolutions } = useAlerts();
  const { user } = useAuth();
  const alert = getAlert(id);

  if (!alert || !user || resolutions[id]) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ThemedText themeColor="textSecondary">
          {resolutions[id] ? 'This has already been fixed.' : 'This alert is no longer active.'}
        </ThemedText>
        <Button title="Back to Home" variant="secondary" onPress={() => router.dismissTo('/home')} />
      </Screen>
    );
  }
  return <FixPlan alert={alert} user={user} />;
}

/** Managers approve fixes; technicians can also take dispatch jobs. */
function canApply(user: User, fix: ScoredFix) {
  if (fix.mode === 'escalate') return can(user, 'approveFixes') || can(user, 'workOrders');
  return can(user, 'approveFixes');
}

function FixPlan({ alert, user }: { alert: Alert; user: User }) {
  const theme = useTheme();
  const { applyFix } = useAlerts();
  const options = alert.fixes.filter((f) => f.feasible); // hide fixes that would land too late
  const [selectedId, setSelectedId] = useState(options[0]?.id);
  const [showOthers, setShowOthers] = useState(false);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const selected = options.find((f) => f.id === selectedId);

  if (!selected) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ThemedText>No fix can land in time. Call the on-site team now.</ThemedText>
      </Screen>
    );
  }

  const allowed = canApply(user, selected);
  const target = alert.chain.find((d) => d.id === selected.stopsAtDominoId);
  const apply = () => {
    if (applyFix(alert.id, selected.id, user.name)) {
      router.replace({ pathname: '/alerts/[id]/done', params: { id: alert.id } });
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ThemedText type="small" themeColor="textSecondary">
        {selected.id === options[0].id ? 'RECOMMENDED FIX' : 'SELECTED FIX'}
      </ThemedText>

      {/* The fix, in three facts */}
      <Card style={styles.main}>
        <ThemedText type="subtitle">{selected.title}</ThemedText>
        <ThemedText themeColor="textSecondary">{selected.detail}</ThemedText>
        <View style={styles.facts}>
          <Fact label="Saves" value={formatUSD(selected.saved)} color={theme.success} />
          <Fact label="Works in" value={formatMinutes(selected.effectMin)} />
          <Fact label="Stops at" value={target?.label ?? '—'} />
        </View>
      </Card>

      {allowed ? (
        <Button
          title={selected.mode === 'escalate' ? 'Send technician' : 'Approve fix'}
          onPress={apply}
        />
      ) : (
        <Card>
          <ThemedText type="small">
            {selected.mode === 'escalate'
              ? 'Only managers and technicians can send a technician.'
              : 'A manager needs to approve this fix.'}
          </ThemedText>
        </Card>
      )}

      {/* Secondary: other fixes and the work order */}
      {options.length > 1 && (
        <Button
          title={showOthers ? 'Hide other options' : `Other options (${options.length - 1})`}
          variant="ghost"
          size="sm"
          onPress={() => setShowOthers(!showOthers)}
        />
      )}
      {showOthers &&
        options
          .filter((f) => f.id !== selected.id)
          .map((f) => (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              onPress={() => {
                setSelectedId(f.id);
                setShowOthers(false);
              }}
              style={({ pressed }) => [
                styles.other,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText type="small" style={styles.flex}>
                {f.title}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="success">
                {formatUSDCompact(f.saved)}
              </ThemedText>
            </Pressable>
          ))}

      <Button
        title={showWorkOrder ? 'Hide work order' : 'Show work order'}
        variant="ghost"
        size="sm"
        onPress={() => setShowWorkOrder(!showWorkOrder)}
      />
      {showWorkOrder && <WorkOrder alert={alert} fix={selected} />}
    </Screen>
  );
}

/** Mock-AI drafted instructions for the technician. */
function WorkOrder({ alert, fix }: { alert: Alert; fix: ScoredFix }) {
  const theme = useTheme();
  const [text, setText] = useState<{ fixId: string; body: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    draftWorkOrder(alert, fix).then((body) => {
      if (!cancelled) setText({ fixId: fix.id, body });
    });
    return () => {
      cancelled = true;
    };
  }, [alert, fix]);

  return text?.fixId === fix.id ? (
    <ThemedText style={[styles.mono, { backgroundColor: theme.backgroundElement }]}>
      {text.body}
    </ThemedText>
  ) : (
    <ActivityIndicator />
  );
}

function Fact({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.fact}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={color ? { color } : undefined}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { padding: Spacing.four, gap: Spacing.three },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  fact: { gap: Spacing.half },
  other: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  flex: { flex: 1 },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
