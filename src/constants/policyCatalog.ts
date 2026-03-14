export type PolicyDefinition = {
  key: string;
  page: string;
  name: string;
  resource: string;
  action: string;
  description: string;
};

export const POLICY_CATALOG: PolicyDefinition[] = [
  {
    key: 'page.users.view',
    page: 'Users Page',
    name: 'View Users Page',
    resource: 'page.users',
    action: 'view',
    description: 'Can open Users tab.',
  },
  {
    key: 'users.invite',
    page: 'Users Page',
    name: 'Invite User',
    resource: 'users',
    action: 'invite',
    description: 'Can invite a user through Cognito.',
  },
  {
    key: 'users.edit',
    page: 'Users Page',
    name: 'Edit User',
    resource: 'users',
    action: 'edit',
    description: 'Can edit user profile fields and status.',
  },
  {
    key: 'users.delete',
    page: 'Users Page',
    name: 'Delete User',
    resource: 'users',
    action: 'delete',
    description: 'Can remove user records.',
  },
  {
    key: 'users.assign-role',
    page: 'Users Page',
    name: 'Assign Role',
    resource: 'users',
    action: 'assignRole',
    description: 'Can assign or remove a role for a user.',
  },
  {
    key: 'users.assign-department',
    page: 'Users Page',
    name: 'Assign Department',
    resource: 'users',
    action: 'assignDepartment',
    description: 'Can assign user department.',
  },
  {
    key: 'page.departments.view',
    page: 'Departments Page',
    name: 'View Departments Page',
    resource: 'page.departments',
    action: 'view',
    description: 'Can open Departments tab.',
  },
  {
    key: 'departments.create',
    page: 'Departments Page',
    name: 'Create Department',
    resource: 'departments',
    action: 'create',
    description: 'Can create departments.',
  },
  {
    key: 'departments.edit',
    page: 'Departments Page',
    name: 'Edit Department',
    resource: 'departments',
    action: 'edit',
    description: 'Can edit department details.',
  },
  {
    key: 'departments.delete',
    page: 'Departments Page',
    name: 'Delete Department',
    resource: 'departments',
    action: 'delete',
    description: 'Can delete departments.',
  },
  {
    key: 'page.access.view',
    page: 'Roles & Policies Page',
    name: 'View Roles & Policies Page',
    resource: 'page.access',
    action: 'view',
    description: 'Can open Roles & Policies tab.',
  },
  {
    key: 'roles.create',
    page: 'Roles & Policies Page',
    name: 'Create Role',
    resource: 'roles',
    action: 'create',
    description: 'Can create new roles.',
  },
  {
    key: 'policies.create',
    page: 'Roles & Policies Page',
    name: 'Create Policy',
    resource: 'policies',
    action: 'create',
    description: 'Can create custom policies.',
  },
  {
    key: 'role-policies.toggle',
    page: 'Roles & Policies Page',
    name: 'Toggle Policy Access',
    resource: 'rolePolicies',
    action: 'toggle',
    description: 'Can enable or disable any policy per role.',
  },
  {
    key: 'page.freelancer.view',
    page: 'Freelancer Home',
    name: 'View Freelancer Home',
    resource: 'page.freelancer',
    action: 'view',
    description: 'Can open Freelancer home page.',
  },
];

export function permissionKey(resource: string, action: string): string {
  return `${resource}:${action}`;
}
