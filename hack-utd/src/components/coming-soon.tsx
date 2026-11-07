import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

/** Placeholder for sections that aren't built yet. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        COMING NEXT
      </ThemedText>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four },
});
