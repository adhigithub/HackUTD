import { Link, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RoleBadge } from '@/components/role-picker';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_LABELS, ROLES, type User } from '@/lib/auth/types';
import { listUsers } from '@/lib/auth/user-store';

export default function UsersScreen() {
  const { user: me } = useAuth();
  const theme = useTheme();
  const [users, setUsers] = useState<User[] | null>(null);

  // Reload whenever we come back from the add/edit screen.
  useFocusEffect(
    useCallback(() => {
      listUsers().then(setUsers);
    }, [])
  );

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Team' }} />
      <Link href="/users/new" asChild>
        <Button title="Add user" />
      </Link>

      {ROLES.map((role) => {
        const group = (users ?? []).filter((u) => u.role === role);
        if (group.length === 0) return null;
        return (
          <View key={role} style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {ROLE_LABELS[role].toUpperCase()}S · {group.length}
            </ThemedText>
            <Card style={styles.list}>
              {group.map((u, i) => (
                <Link key={u.id} href={{ pathname: '/users/[id]', params: { id: u.id } }} asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                      pressed && { backgroundColor: theme.backgroundSelected },
                    ]}>
                    <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                      <ThemedText type="smallBold" style={{ color: theme.primary }}>
                        {initials(u.name)}
                      </ThemedText>
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">
                        {u.name}
                        {u.id === me?.id ? ' (you)' : ''}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {u.email}
                      </ThemedText>
                    </View>
                    <RoleBadge role={u.role} />
                  </Pressable>
                </Link>
              ))}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  list: { padding: 0, gap: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
