import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TONES: [ThemeColor, ThemeColor][] = [
  ['primarySoft', 'primary'],
  ['successSoft', 'success'],
  ['warningSoft', 'warning'],
];

/** Same person → same color, every time. */
function toneFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return TONES[hash % TONES.length];
}

/** Round initials badge, e.g. "TR" for Tom Reyes. */
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const theme = useTheme();
  const [bg, fg] = toneFor(name);
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme[bg] },
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: theme[fg], fontSize: size * 0.4, lineHeight: size * 0.5 }}>
        {initials}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
