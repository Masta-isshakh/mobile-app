export type Role = { id: string; name: string; description?: string | null };
export type Department = { id: string; name: string; description?: string | null };
export type Policy = {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
};
export type AppUser = {
  id: string;
  username: string;
  email: string;
  cognitoUsername?: string | null;
  displayName?: string | null;
  status?: string | null;
  departmentId?: string | null;
  ownerSub?: string | null;
};
export type UserRole = { id: string; userId: string; roleId: string };
export type RolePolicy = {
  id: string;
  roleId: string;
  policyId: string;
  effect?: 'ALLOW' | 'DENY' | null;
};

export type PermissionCheck = (resource: string, action: string) => boolean;

export type BottomTabItem = {
  key: string;
  label: string;
  subtitle?: string;
};
