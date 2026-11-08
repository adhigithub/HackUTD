import { BlackOpsOne_400Regular, useFonts } from '@expo-google-fonts/black-ops-one';
import { NewTegomin_400Regular } from '@expo-google-fonts/new-tegomin';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth/auth-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({ BlackOpsOne_400Regular, NewTegomin_400Regular });
  // Fall back to the system font rather than hang if the font fails to load.
  const ready = !isLoading && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Keep the native splash up until we know who's signed in and the custom fonts are ready.
  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* "/" — always available; redirects to sign-in or home. Must stay first so
          it's where the navigator lands when a guard flips (sign in / sign out). */}
      <Stack.Screen name="index" />

      {/* Signed out: only the login / sign-up screens exist. */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Signed in: the app. Signing out flips the guard and returns to login. */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
