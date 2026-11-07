import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { RolePicker } from '@/components/role-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';
import type { Role } from '@/lib/auth/types';
import { AuthError, validateNewUser } from '@/lib/auth/user-store';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('manager');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const input = { name, email, password, role };
    const invalid = validateNewUser(input);
    if (invalid) return setError(invalid);
    setError(null);
    setSubmitting(true);
    try {
      await signUp(input); // signs in → root guard routes to Home
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Card style={styles.form}>
        <ErrorBanner message={error} />
        <TextField label="Full name" value={name} onChangeText={setName} autoComplete="name" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          hint="At least 6 characters."
        />
        <RolePicker value={role} onChange={setRole} />
        <Button title="Create account" loading={submitting} onPress={submit} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, padding: Spacing.four },
});
