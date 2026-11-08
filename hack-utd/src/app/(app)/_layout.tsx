import { Stack } from 'expo-router';

import { useAuth } from '@/lib/auth/auth-context';
import { can } from '@/lib/auth/types';

export default function AppLayout() {
  const { user } = useAuth();

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

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
  );
}
