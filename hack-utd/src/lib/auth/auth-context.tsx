import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  useEffect(() => {
    (async () => {
      try {
        await store.seedDemoUsers();
        const id = await store.loadSessionUserId();
        if (id) setUser(await store.getUser(id));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await store.verifyCredentials(email, password);
    await store.saveSession(u.id);
    setUser(u);
  }, []);

  const signUp = useCallback(async (input: store.NewUserInput) => {
    const u = await store.createUser(input);
    await store.saveSession(u.id);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await store.clearSession();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const id = await store.loadSessionUserId();
    const u = id ? await store.getUser(id) : null;
    if (!u) await store.clearSession();
    setUser(u);
  }, []);

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
