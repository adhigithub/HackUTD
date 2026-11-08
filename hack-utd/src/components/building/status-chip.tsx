import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LEVELS, type Level } from '@/lib/incidents/plain-status';

const SOFT = { good: 'successSoft', watch: 'warningSoft', act: 'dangerSoft' } as const;

/** "✓ All good" / "! Keep an eye on it" / "!! Needs attention" — color plus words, never color alone. */
export function StatusChip({ level }: { level: Level }) {
  const theme = useTheme();
  const { label, tone, icon } = LEVELS[level];
  return (
    <View style={[styles.chip, { backgroundColor: theme[SOFT[level]] }]}>
      <ThemedText type="smallBold" themeColor={tone} style={styles.text}>
        {icon} {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  text: { fontSize: 12, lineHeight: 16 },
});
