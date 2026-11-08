import { Link } from 'expo-router';

import { RoleBadge } from '@/components/role-picker';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/lib/auth/auth-context';
import { can } from '@/lib/auth/types';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
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

      <Button title="Sign out" variant="danger" onPress={signOut} />
    </Screen>
  );
}
