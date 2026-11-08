import type { Role } from '@/lib/auth/types';

/**
 * The people on the demo site team. Names match the demo login accounts so
 * signing in as Tom or Maya lines up with what the alerts say.
 */
export type Person = {
  name: string;
  role: Role;
  /** Plain-language job + shift, shown under their name. */
  title: string;
};

export const TEAM = {
  tom: { name: 'Tom Reyes', role: 'technician', title: 'Night-shift technician' },
  maya: { name: 'Maya Patel', role: 'manager', title: 'On-call manager' },
  jordan: { name: 'Jordan Ellis', role: 'technician', title: 'Day-shift technician' },
} satisfies Record<string, Person>;

