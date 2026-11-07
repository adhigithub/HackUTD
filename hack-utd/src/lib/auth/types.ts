export type Role = 'manager' | 'technician' | 'advisor';

export const ROLES: Role[] = ['manager', 'technician', 'advisor'];

export const ROLE_LABELS: Record<Role, string> = {
  manager: 'Manager',
  technician: 'Technician',
  advisor: 'CBRE Advisor',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  manager: 'Oversees buildings, approves fixes, manages the team',
  technician: 'Receives work orders and fixes equipment on site',
  advisor: 'Reviews portfolio impact and client reports',
};

/** A user as stored on the device. Never leaves storage with the hash exposed to UI. */
export type StoredUser = {
  id: string;
  name: string;
  email: string; // always lowercase
  role: Role;
  salt: string;
  passwordHash: string;
  createdAt: string; // ISO
};

/** What the UI is allowed to see. */
export type User = Omit<StoredUser, 'salt' | 'passwordHash'>;

export type Permission = 'manageUsers' | 'approveFixes' | 'viewReports' | 'workOrders';

const PERMISSIONS: Record<Role, Permission[]> = {
  manager: ['manageUsers', 'approveFixes', 'viewReports', 'workOrders'],
  technician: ['workOrders'],
  advisor: ['viewReports'],
};

export function can(user: Pick<User, 'role'> | null | undefined, permission: Permission) {
  return !!user && PERMISSIONS[user.role].includes(permission);
}
