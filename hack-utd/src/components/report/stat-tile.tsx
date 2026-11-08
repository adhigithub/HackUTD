import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';

export function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ''}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.value}>{value}</ThemedText>
      {detail ? (
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flexGrow: 1, flexBasis: '45%', minWidth: 140, gap: 2 },
  value: { fontSize: 26, lineHeight: 32, fontWeight: 700, fontVariant: ['tabular-nums'] },
});
