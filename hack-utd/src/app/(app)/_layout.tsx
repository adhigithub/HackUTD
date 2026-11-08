import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { AlertsProvider } from '@/features/alerts/alerts-context';
import { useAuth } from '@/lib/auth/auth-context';
import { can } from '@/lib/auth/types';

export default function AppLayout() {
  const { user } = useAuth();
  const theme = useTheme();

  return (
    <AlertsProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Flowchart: Alert Detail → Fix Plan → Fix Done */}
        <Stack.Screen name="alerts/[id]/index" options={{ title: 'Alert' }} />
        <Stack.Screen name="alerts/[id]/fix" options={{ title: 'Fix plan' }} />
        <Stack.Screen
          name="alerts/[id]/done"
          options={{ title: 'Fix applied', headerBackVisible: false, gestureEnabled: false }}
        />

        {/* Reached from the Account tab; every signed-in role can change their own password. */}
        <Stack.Screen name="change-password" options={{ title: 'Change password' }} />

        {/* Ask AI belongs to the Client Report, so it follows the same permission. */}
        <Stack.Protected guard={can(user, 'viewReports')}>
          <Stack.Screen name="ask" options={{ title: 'Ask AI' }} />
        </Stack.Protected>

        {/* User management is manager-only. Other roles can't navigate here even by URL. */}
        <Stack.Protected guard={can(user, 'manageUsers')}>
          <Stack.Screen name="users/index" options={{ title: 'Team' }} />
          <Stack.Screen name="users/[id]" options={{ title: 'User' }} />
        </Stack.Protected>
      </Stack>
    </AlertsProvider>
  );
}
