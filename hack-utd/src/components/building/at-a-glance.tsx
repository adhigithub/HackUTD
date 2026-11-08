import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { Building } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { buildingSummary, LEVELS } from '@/lib/incidents/plain-status';
import { useNow } from '@/lib/time/now';

import { StatusChip } from './status-chip';

/**
 * The first thing on the page: "How is this building doing?" answered in one
 * word, with a short plain-English list of why. No numbers needed.
 */
export function AtAGlance({ building }: { building: Building }) {
  const theme = useTheme();
  const now = useNow();
  const { level, reasons } = buildingSummary(building, now);
  const tone = LEVELS[level].tone;

  return (
    <Card style={{ borderColor: theme[tone], borderWidth: 2 }}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          HOW IS IT DOING?
        </ThemedText>
        <StatusChip level={level} />
      </View>

      {reasons.length === 0 ? (
        <ThemedText>Everything is running normally. Nothing needs you right now.</ThemedText>
      ) : (
        <View style={styles.list}>
          {reasons.map((r) => (
            <View key={r.text} style={styles.reason}>
              <View style={[styles.bullet, { backgroundColor: theme[LEVELS[r.level].tone] }]} />
              <ThemedText style={styles.reasonText}>{r.text}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { gap: Spacing.one },
  reason: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bullet: { width: 10, height: 10, borderRadius: 5 },
  reasonText: { flex: 1 },
});
