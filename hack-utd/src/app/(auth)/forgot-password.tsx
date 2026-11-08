import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Screen } from '@/components/ui/screen';
import { TextField, type TextFieldHandle } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { AuthError, resetPassword } from '@/lib/auth/user-store';

export default function ForgotPasswordScreen() {
  // Sign-in passes along whatever email was already typed, so it doesn't need retyping.
  const params = useLocalSearchParams<{ email?: string }>();
  const nextRef = useRef<TextFieldHandle>(null);
  const confirmRef = useRef<TextFieldHandle>(null);
  const [email, setEmail] = useState(params.email ?? '');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    if (next !== confirm) return setError('Passwords do not match.');
    setError(null);
    setSaving(true);
    try {
      await resetPassword(email, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function backToSignIn() {
    if (router.canGoBack()) router.back();
    else router.replace('/sign-in');
  }

  if (done) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Card style={styles.form}>
          <ThemedText type="smallBold" themeColor="success">
            Password updated.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            You can now sign in with your new password.
          </ThemedText>
          <Button title="Back to sign in" onPress={backToSignIn} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Card style={styles.form}>
        <ThemedText type="small" themeColor="textSecondary">
          Enter the email for your account and choose a new password.
        </ThemedText>
        <ErrorBanner message={error} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
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
          title="Reset password"
          loading={saving}
          disabled={!email || !next || !confirm}
          onPress={save}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, padding: Spacing.four },
});
