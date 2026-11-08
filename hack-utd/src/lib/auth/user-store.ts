/**
 * Local, on-device user database for the hackathon demo.
 *
 * Users live in AsyncStorage (works on iOS, Android, web, and Expo Go).
 * Passwords are salted and hashed with SHA-256, never stored in plain text.
 * This is demo-grade auth: there is no server, so anyone with the device can
 * read storage. Swap this module for a real backend later; the rest of the app
 * only talks to it through these functions.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { Role, StoredUser, User } from './types';

const USERS_KEY = 'blueprint.users.v1';
const SESSION_KEY = 'blueprint.session.v1';

export const DEMO_PASSWORD = 'demo1234';

export const DEMO_ACCOUNTS: { name: string; email: string; role: Role }[] = [
  { name: 'Maya Patel', email: 'manager@blueprint.demo', role: 'manager' },
  { name: 'Tom Reyes', email: 'tech@blueprint.demo', role: 'technician' },
  { name: 'Ava Chen', email: 'advisor@blueprint.demo', role: 'advisor' },
];

export class AuthError extends Error {}

function toPublic({ salt: _s, passwordHash: _h, ...user }: StoredUser): User {
  return user;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

async function readAll(): Promise<StoredUser[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

async function writeAll(users: StoredUser[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function buildUser(input: NewUserInput): Promise<StoredUser> {
  const salt = Crypto.randomUUID();
  return {
    id: Crypto.randomUUID(),
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    role: input.role,
    salt,
    passwordHash: await hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
  };
}

/** Creates the demo accounts the first time the app runs. */
export async function seedDemoUsers() {
  const users = await readAll();
  if (users.length > 0) return;
  const seeded: StoredUser[] = [];
  for (const account of DEMO_ACCOUNTS) {
    seeded.push(await buildUser({ ...account, password: DEMO_PASSWORD }));
  }
  await writeAll(seeded);
}

export type NewUserInput = { name: string; email: string; password: string; role: Role };

export function validateNewUser(input: NewUserInput): string | null {
  if (!input.name.trim()) return 'Enter a name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Enter a valid email.';
  if (input.password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export async function listUsers(): Promise<User[]> {
  return (await readAll()).map(toPublic);
}

export async function getUser(id: string): Promise<User | null> {
  const user = (await readAll()).find((u) => u.id === id);
  return user ? toPublic(user) : null;
}

export async function createUser(input: NewUserInput): Promise<User> {
  const error = validateNewUser(input);
  if (error) throw new AuthError(error);
  const users = await readAll();
  if (users.some((u) => u.email === normalizeEmail(input.email))) {
    throw new AuthError('An account with that email already exists.');
  }
  const user = await buildUser(input);
  await writeAll([...users, user]);
  return toPublic(user);
}

export async function verifyCredentials(email: string, password: string): Promise<User> {
  const user = (await readAll()).find((u) => u.email === normalizeEmail(email));
  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
    throw new AuthError('Incorrect email or password.');
  }
  return toPublic(user);
}

export type UserUpdate = { name?: string; role?: Role; password?: string };

export async function updateUser(id: string, update: UserUpdate): Promise<User> {
  const users = await readAll();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw new AuthError('User not found.');
  const current = users[index];

  if (update.role && update.role !== 'manager' && current.role === 'manager') {
    const managers = users.filter((u) => u.role === 'manager');
    if (managers.length === 1) throw new AuthError('There must be at least one manager.');
  }
  if (update.name !== undefined && !update.name.trim()) throw new AuthError('Enter a name.');
  if (update.password !== undefined && update.password.length < 6) {
    throw new AuthError('Password must be at least 6 characters.');
  }

  const next: StoredUser = {
    ...current,
    name: update.name?.trim() ?? current.name,
    role: update.role ?? current.role,
  };
  if (update.password) {
    next.salt = Crypto.randomUUID();
    next.passwordHash = await hashPassword(update.password, next.salt);
  }
  users[index] = next;
  await writeAll(users);
  return toPublic(next);
}

/**
 * Sets a new password for the account with this email (the "Forgot password?" flow).
 * Demo-grade: with no email server there is no reset link, so this resets directly.
 * A real backend would email a one-time link and only change the password from it.
 */
export async function resetPassword(email: string, newPassword: string): Promise<void> {
  const user = (await readAll()).find((u) => u.email === normalizeEmail(email));
  if (!user) throw new AuthError('No account found with that email.');
  await updateUser(user.id, { password: newPassword });
}

export async function deleteUser(id: string) {
  const users = await readAll();
  const target = users.find((u) => u.id === id);
  if (!target) return;
  if (target.role === 'manager' && users.filter((u) => u.role === 'manager').length === 1) {
    throw new AuthError('There must be at least one manager.');
  }
  await writeAll(users.filter((u) => u.id !== id));
}

/** Wipes all users and re-creates the demo accounts. */
export async function resetToDemoUsers() {
  await AsyncStorage.multiRemove([USERS_KEY, SESSION_KEY]);
  await seedDemoUsers();
}

/**
 * Sessions are no longer saved (sign-in is required on every launch); this only
 * removes a session left behind on the device by an older build.
 */
export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
