import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RoleBadge } from '@/components/role-picker';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';
import { can } from '@/lib/auth/types';
import { AuthError, updateUser, verifyCredentials } from '@/lib/auth/user-store';

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

      <ChangePassword userId={user.id} email={user.email} />

      <Button title="Sign out" variant="danger" onPress={signOut} />
    </Screen>
  );
}

function ChangePassword({ userId, email }: { userId: string; email: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setDone(false);
    setSaving(true);
    try {
      await verifyCredentials(email, current);
      await updateUser(userId, { password: next });
      setCurrent('');
      setNext('');
      setDone(true);
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message === 'Incorrect email or password.'
            ? 'Current password is incorrect.'
            : err.message
          : 'Something went wrong.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.gap}>
      <ThemedText type="smallBold">Change password</ThemedText>
      <ErrorBanner message={error} />
      {done && (
        <ThemedText type="small" themeColor="success">
          Password updated.
        </ThemedText>
      )}
      <TextField
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
      />
      <TextField
        label="New password"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        hint="At least 6 characters."
      />
      <View style={styles.row}>
        <Button
          title="Update password"
          size="sm"
          variant="secondary"
          loading={saving}
          disabled={!current || !next}
          onPress={save}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.three },
  row: { flexDirection: 'row' },
});
