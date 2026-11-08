import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // A solid header background keeps the iOS 26 header from being see-through,
        // which would let the form scroll up underneath it. Matches the (app) stack.
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" options={{ headerShown: true, title: 'Create account' }} />
    </Stack>
  );
}
