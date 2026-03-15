export type Role = {
  id: string;
  name: string;
  description?: string | null;
  departmentId?: string | null;
};
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

export type Product = {
  id: string;
  name: string;
  price?: number | null;
  description?: string | null;
  imageDataUrl?: string | null;
  creatorSub: string;
  creatorUsername: string;
};

export type StoreProduct = {
  id: string;
  productId: string;
  ownerSub: string;
  ownerUsername: string;
};

export type ProductRating = {
  id: string;
  productId: string;
  userSub: string;
  score: number;
  comment?: string | null;
};

export type AuthUserContext = {
  sub: string;
  username: string;
  email?: string;
  cognitoUsername?: string;
};

export type PermissionCheck = (resource: string, action: string) => boolean;

export type BottomTabItem = {
  key: string;
  label: string;
  icon?: string;
  subtitle?: string;
};
