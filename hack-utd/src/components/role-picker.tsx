import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, type Role } from '@/lib/auth/types';

export function RolePicker({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      <ThemedText type="smallBold">Role</ThemedText>
      {ROLES.map((role) => {
        const selected = role === value;
        return (
          <Pressable
            key={role}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(role)}
            style={[
              styles.option,
              {
                borderColor: selected ? theme.primary : theme.border,
                backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
              },
            ]}>
            <View
              style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>
              {selected && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
            </View>
            <View style={styles.text}>
              <ThemedText type="smallBold">{ROLE_LABELS[role]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {ROLE_DESCRIPTIONS[role]}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
      <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12, lineHeight: 16 }}>
        {ROLE_LABELS[role]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
});
