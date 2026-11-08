import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Logo } from '@/components/ui/logo';
import { Screen } from '@/components/ui/screen';
import { TextField, type TextFieldHandle } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_LABELS } from '@/lib/auth/types';
import { AuthError, DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/auth/user-store';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const passwordRef = useRef<TextFieldHandle>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e = email, p = password) {
    setError(null);
    setSubmitting(true);
    try {
      // On success the root layout's guard flips and routes to Home.
      await signIn(e, p);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.brand}>
        <View style={[styles.logo, { borderColor: theme.border }]}>
          <Logo size={60} color="#003891" background="#95c910" />
        </View>
        <ThemedText type="title">BluePrint</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Predict building problems before they spread.
        </ThemedText>
      </View>

      <Card style={styles.form}>
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
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => submit()}
        />
        <Button title="Sign in" loading={submitting} onPress={() => submit()} />
        <Link href="/sign-up" asChild>
          <Button title="Create an account" variant="ghost" />
        </Link>
      </Card>

      <View style={styles.demo}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          DEMO ACCOUNTS · password {DEMO_PASSWORD}
        </ThemedText>
        {DEMO_ACCOUNTS.map((account) => (
          <Pressable
            key={account.email}
            disabled={submitting}
            onPress={() => {
              setEmail(account.email);
              setPassword(DEMO_PASSWORD);
              submit(account.email, DEMO_PASSWORD);
            }}
            style={({ pressed }) => [
              styles.demoRow,
              { borderColor: theme.border, backgroundColor: theme.backgroundElement },
              pressed && { opacity: 0.7 },
            ]}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{ROLE_LABELS[account.role]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {account.email}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              Sign in →
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five },
  logo: {
    width: 80,
    height: 80,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: '#95c910',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  form: { gap: Spacing.three, padding: Spacing.four },
  demo: { gap: Spacing.two },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  flex: { flex: 1 },
});
