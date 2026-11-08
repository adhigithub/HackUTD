import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SUGGESTED_QUESTIONS } from '@/lib/ai/suggestions';
import type { Role } from '@/lib/auth/types';
import type { ReportPeriod } from '@/lib/portfolio/report';

export function openAsk(period: ReportPeriod, question?: string) {
  router.push({
    pathname: '/ask',
    params: question ? { period: String(period), q: question } : { period: String(period) },
  });
}

/** Entry point to Ask AI from the Client Report. */
export function AskAiCard({ role, period }: { role: Role; period: ReportPeriod }) {
  const theme = useTheme();
  const suggestions = SUGGESTED_QUESTIONS[role].slice(0, 3);

  return (
    <Card style={[styles.card, { borderColor: theme.primary }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <SymbolView
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            tintColor={theme.primary}
            size={20}
          />
        </View>
        <View style={styles.flex}>
          <ThemedText type="subtitle">Ask AI</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ask anything about this report in plain English. Tap a question to try it.
          </ThemedText>
        </View>
      </View>

      <View style={styles.chips}>
        {suggestions.map((q) => (
          <Pressable
            key={q}
            accessibilityRole="button"
            accessibilityHint="Opens Ask AI with this question"
            onPress={() => openAsk(period, q)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.primarySoft },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={{ color: theme.primary }}>
              {q}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Button title="Ask a question" onPress={() => openAsk(period)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  header: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  chips: { gap: Spacing.two },
  chip: { borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  pressed: { opacity: 0.7 },
});
