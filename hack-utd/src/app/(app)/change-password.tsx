import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Screen } from '@/components/ui/screen';
import { TextField, type TextFieldHandle } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';
import { AuthError, updateUser, verifyCredentials } from '@/lib/auth/user-store';

export default function ChangePasswordScreen() {
  const { user } = useAuth();
  const nextRef = useRef<TextFieldHandle>(null);
  const confirmRef = useRef<TextFieldHandle>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!user) return null;
  const { id, email } = user;

  async function save() {
    if (next !== confirm) return setError('New passwords do not match.');
    if (next === current) return setError('New password must be different from your current one.');
    setError(null);
    setSaving(true);
    try {
      await verifyCredentials(email, current);
      await updateUser(id, { password: next });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message === 'Incorrect email or password.'
            ? 'Current password is incorrect.'
            : err.message
          : 'Something went wrong. Try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  }

  if (done) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Card style={styles.form}>
          <ThemedText type="smallBold" themeColor="success">
            Password updated.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Use your new password the next time you sign in.
          </ThemedText>
          <Button title="Done" onPress={goBack} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Card style={styles.form}>
        <ThemedText type="small" themeColor="textSecondary">
          Enter your current password, then choose a new one.
        </ThemedText>
        <ErrorBanner message={error} />
        <TextField
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          onSubmitEditing={() => nextRef.current?.focus()}
        />
        <TextField
          ref={nextRef}
          label="New password"
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint="At least 6 characters."
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextField
          ref={confirmRef}
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={save}
        />
        <Button
          title="Update password"
          loading={saving}
          disabled={!current || !next || !confirm}
          onPress={save}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, padding: Spacing.four },
});
