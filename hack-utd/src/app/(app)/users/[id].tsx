import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { RolePicker } from '@/components/role-picker';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';
import type { Role } from '@/lib/auth/types';
import { AuthError, createUser, deleteUser, getUser, updateUser } from '@/lib/auth/user-store';

/** `/users/new` creates a user; `/users/<id>` edits one. */
export default function UserEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { user: me, refreshUser } = useAuth();

  const [loaded, setLoaded] = useState(isNew);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('technician');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) return;
    getUser(id).then((u) => {
      if (!u) setNotFound(true);
      else {
        setName(u.name);
        setEmail(u.email);
        setRole(u.role);
      }
      setLoaded(true);
    });
  }, [id, isNew]);

  const isSelf = !isNew && id === me?.id;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setSaving(true);
    try {
      await action();
      if (router.canGoBack()) router.back();
      else router.replace('/users');
      // Own role may have changed; if demoted, the manager-only guard closes these screens.
      if (isSelf) await refreshUser();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong.');
      setSaving(false);
    }
  }

  const save = () =>
    run(() =>
      isNew
        ? createUser({ name, email, password, role })
        : updateUser(id, { name, role, ...(password ? { password } : {}) })
    );

  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    run(() => deleteUser(id));
  };

  if (notFound) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ThemedText>That user no longer exists.</ThemedText>
      </Screen>
    );
  }
  if (!loaded) return null;

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: isNew ? 'Add user' : 'Edit user' }} />
      <Card style={styles.form}>
        <ErrorBanner message={error} />
        <TextField label="Full name" value={name} onChangeText={setName} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          editable={isNew}
          autoCapitalize="none"
          keyboardType="email-address"
          hint={isNew ? undefined : 'Email can’t be changed.'}
        />
        <TextField
          label={isNew ? 'Temporary password' : 'Reset password'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder={isNew ? undefined : 'Leave blank to keep current'}
          hint="At least 6 characters. Share it with them directly."
        />
        <RolePicker value={role} onChange={setRole} />
        {isSelf && role !== 'manager' && (
          <ThemedText type="small" themeColor="warning">
            You’re removing your own manager role. You’ll lose access to this screen.
          </ThemedText>
        )}
        <Button title={isNew ? 'Add user' : 'Save changes'} loading={saving} onPress={save} />
      </Card>

      {!isNew && !isSelf && (
        <Button
          title={confirmDelete ? 'Tap again to remove this user' : 'Remove user'}
          variant="danger"
          disabled={saving}
          onPress={remove}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, padding: Spacing.four },
});
