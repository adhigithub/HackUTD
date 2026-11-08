import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { formatMoney, type Alert } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';

type Path = 'ignore' | 'act';

/**
 * Two futures, side by side: what happens if nobody acts, and what happens if
 * we act now. The dollar gap between them is the reason to act.
 */
export function WhatHappensNext({ alert }: { alert: Alert }) {
  const theme = useTheme();
  const [path, setPath] = useState<Path>('ignore');
  const saved = alert.costAtRisk - alert.costAfterFix;
  const fixedPct = alert.costAtRisk > 0 ? (alert.costAfterFix / alert.costAtRisk) * 100 : 0;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">What happens next?</ThemedText>

      <View style={[styles.switch, { backgroundColor: theme.backgroundSelected }]} accessibilityRole="tablist">
        {(
          [
            { value: 'ignore', label: 'If nobody acts' },
            { value: 'act', label: 'If we act now' },
          ] as const
        ).map((o) => {
          const selected = path === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setPath(o.value)}
              style={[styles.option, selected && { backgroundColor: theme.backgroundElement }]}>
              <ThemedText
                type="smallBold"
                themeColor={selected ? (o.value === 'ignore' ? 'danger' : 'success') : 'textSecondary'}>
                {o.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {path === 'ignore' ? (
        <Steps
          tone="danger"
          items={alert.chain.map((step, i) => ({ text: step, tag: alert.chainEta?.[i] }))}
        />
      ) : (
        <>
          <Steps
            tone="primary"
            numbered
            items={alert.fixSteps.map((step) => ({ text: step }))}
          />
          {alert.ifFixed && (
            <Steps tone="success" items={alert.ifFixed.map((text) => ({ text, check: true }))} />
          )}
        </>
      )}

      {/* The money, both ways */}
      <View style={styles.costs}>
        <CostBar label="If nobody acts" amount={alert.costAtRisk} pct={100} tone="danger" />
        <CostBar label="If we act now" amount={alert.costAfterFix} pct={fixedPct} tone="success" />
      </View>
      {saved > 0 && (
        <ThemedText type="smallBold" themeColor="success">
          Acting now saves ≈ {formatMoney(saved)}
        </ThemedText>
      )}
    </View>
  );
}

type StepItem = { text: string; tag?: string; check?: boolean };

function Steps({
  items,
  tone,
  numbered,
}: {
  items: StepItem[];
  tone: ThemeColor;
  numbered?: boolean;
}) {
  const theme = useTheme();
  return (
    <View>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <View key={item.text} style={styles.step}>
            <View style={styles.markerCol}>
              <View style={[styles.marker, { borderColor: theme[tone], backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" themeColor={tone} style={styles.markerText}>
                  {item.check ? '✓' : numbered ? i + 1 : '!'}
                </ThemedText>
              </View>
              {!last && <View style={[styles.connector, { backgroundColor: theme[tone] }]} />}
            </View>
            <View style={styles.stepBody}>
              {item.tag && (
                <ThemedText type="smallBold" themeColor={tone} style={styles.tag}>
                  {item.tag.toUpperCase()}
                </ThemedText>
              )}
              <ThemedText type="small">{item.text}</ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function CostBar({ label, amount, pct, tone }: { label: string; amount: number; pct: number; tone: ThemeColor }) {
  const theme = useTheme();
  return (
    <View style={styles.costRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.costLabel}>
        {label}
      </ThemedText>
      <View style={[styles.costTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.costFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: theme[tone] }]} />
      </View>
      <ThemedText type="smallBold" themeColor={tone} style={styles.costAmount}>
        {formatMoney(amount)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  switch: { flexDirection: 'row', padding: Spacing.one, borderRadius: Radius.md },
  option: { flex: 1, alignItems: 'center', paddingVertical: Spacing.one + 2, borderRadius: Radius.sm },
  step: { flexDirection: 'row', gap: Spacing.two },
  markerCol: { alignItems: 'center', width: 22 },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { fontSize: 11, lineHeight: 14 },
  connector: { width: 2, flex: 1, minHeight: 10, opacity: 0.4 },
  stepBody: { flex: 1, paddingBottom: Spacing.two, paddingTop: 1 },
  tag: { fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },
  costs: { gap: Spacing.one },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  costLabel: { width: 104 },
  costTrack: { flex: 1, height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  costFill: { height: '100%', borderRadius: Radius.pill },
  costAmount: { width: 56, textAlign: 'right' },
});
