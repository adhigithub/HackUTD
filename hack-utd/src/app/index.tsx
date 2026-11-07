import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth/auth-context';

/**
 * Entry route ("/"). Expo Go and the web both open here first, so this always
 * has to match — it just forwards to the right place for the current session.
 */
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/home' : '/sign-in'} />;
}
