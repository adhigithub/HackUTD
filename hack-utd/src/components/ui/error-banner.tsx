import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ErrorBanner({ message }: { message: string | null }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: theme.dangerSoft }]}>
      <ThemedText type="small" style={{ color: theme.danger }}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: Radius.md, padding: Spacing.three },
});
