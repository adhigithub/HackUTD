import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { RoleBadge } from '@/components/role-picker';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { can } from '@/lib/auth/types';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  if (!user) return null;

  return (
    <Screen edges={['left', 'right']}>
      <Card>
        <ThemedText type="subtitle">{user.name}</ThemedText>
        <ThemedText themeColor="textSecondary">{user.email}</ThemedText>
        <RoleBadge role={user.role} />
      </Card>

      {can(user, 'manageUsers') && (
        <Card>
          <ThemedText type="smallBold">Team</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Add people, change roles, and remove access.
          </ThemedText>
          <Link href="/users" asChild>
            <Button title="Manage users" variant="secondary" />
          </Link>
        </Card>
      )}

      <Card>
        <ThemedText type="smallBold">Security</ThemedText>
        <Link href="/change-password" asChild>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              Change password
            </ThemedText>
          </Pressable>
        </Link>
      </Card>

      <Button title="Sign out" variant="danger" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
});
