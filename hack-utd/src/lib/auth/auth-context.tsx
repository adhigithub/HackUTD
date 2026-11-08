import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type { User } from './types';
import * as store from './user-store';

type AuthValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: store.NewUserInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads the signed-in user (e.g. after a manager edits their own role). */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sign-in is one-time use: the session lives only in memory, never in storage,
  // so every fresh launch of the app starts signed out on the sign-in page.
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await store.seedDemoUsers();
        // Older builds saved the session to the device; wipe it so it can't linger.
        await store.clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setSession = useCallback((u: User | null) => {
    userIdRef.current = u?.id ?? null;
    setUser(u);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setSession(await store.verifyCredentials(email, password));
    },
    [setSession]
  );

  const signUp = useCallback(
    async (input: store.NewUserInput) => {
      setSession(await store.createUser(input));
    },
    [setSession]
  );

  const signOut = useCallback(async () => {
    setSession(null);
  }, [setSession]);

  const refreshUser = useCallback(async () => {
    const id = userIdRef.current;
    setSession(id ? await store.getUser(id) : null);
  }, [setSession]);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signUp, signOut, refreshUser }),
    [user, isLoading, signIn, signUp, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
