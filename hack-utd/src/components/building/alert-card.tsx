import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatMoney, formatTimeAgo, type Alert } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { useNow } from '@/lib/time/now';

import { SeverityPill } from './severity-pill';
import { WhatHappensNext } from './what-happens-next';

/**
 * One alert: what's wrong, what it could cost, and (tap to open) what happens
 * if nobody acts vs. if we act now.
 *
 * Not shown on the Data tab any more. Kept here, ready for the Home page.
 */
export function AlertCard({ alert }: { alert: Alert }) {
  const theme = useTheme();
  const now = useNow();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <View style={styles.topRow}>
        <SeverityPill severity={alert.severity} />
        <ThemedText type="small" themeColor="textSecondary">
          {formatTimeAgo(alert.detectedAt, now)}
        </ThemedText>
      </View>

      <ThemedText type="smallBold">{alert.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {alert.summary}
      </ThemedText>

      <ThemedText type="smallBold" themeColor="danger">
        Could cost {formatMoney(alert.costAtRisk)} if nobody acts
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => [styles.disclosure, { borderColor: theme.border }, pressed && styles.pressed]}>
        <ThemedText type="smallBold" themeColor="primary">
          {expanded ? 'Hide ▴' : 'What happens next? ▾'}
        </ThemedText>
      </Pressable>

      {expanded && <WhatHappensNext alert={alert} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disclosure: { borderTopWidth: 1, paddingTop: Spacing.two },
  pressed: { opacity: 0.75 },
});
