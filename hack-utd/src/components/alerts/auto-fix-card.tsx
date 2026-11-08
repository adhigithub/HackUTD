import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatUSD } from '@/features/alerts/format';
import type { AutoFix } from '@/features/alerts/types';

/** Safe, reversible fixes BluePrint did on its own overnight (spec Scenario 1). */
export function AutoFixCard({
  fixes,
  canUndo,
  onSetUndone,
}: {
  fixes: AutoFix[];
  canUndo: boolean;
  onSetUndone: (id: string, undone: boolean) => void;
}) {
  if (fixes.length === 0) return null;

  return (
    <Card>
      <ThemedText type="smallBold" themeColor="textSecondary">
        🌙 FIXED AUTOMATICALLY OVERNIGHT
      </ThemedText>
      {fixes.map((f) => (
        <View key={f.id} style={styles.row}>
          <View style={styles.flex}>
            <ThemedText type="small">{f.title}</ThemedText>
            <ThemedText type="small" themeColor={f.undone ? 'textSecondary' : 'success'}>
              {f.undone ? 'Undone' : `Saves ${formatUSD(f.savedPerNight)} tonight`}
            </ThemedText>
          </View>
          {canUndo && (
            <Button
              title={f.undone ? 'Redo' : 'Undo'}
              size="sm"
              variant="ghost"
              onPress={() => onSetUndone(f.id, !f.undone)}
            />
          )}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
