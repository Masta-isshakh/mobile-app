import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { adminManagementFunction } from '../functions/admin-management/resource';

const schema = a.schema({
  Department: a
    .model({
      name: a.string().required(),
      description: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.groups(['ADMIN'])]),

  Role: a
    .model({
      name: a.string().required(),
      description: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.groups(['ADMIN'])]),

  Policy: a
    .model({
      name: a.string().required(),
      resource: a.string().required(),
      action: a.string().required(),
      description: a.string(),
    })
    .authorization((allow) => [allow.groups(['ADMIN'])]),

  RolePolicy: a
    .model({
      roleId: a.id().required(),
      policyId: a.id().required(),
      effect: a.enum(['ALLOW', 'DENY']),
    })
    .authorization((allow) => [allow.groups(['ADMIN'])]),

  AppUser: a
    .model({
      username: a.string().required(),
      email: a.string().required(),
      displayName: a.string(),
      status: a.enum(['INVITED', 'ACTIVE', 'DISABLED']),
      cognitoUsername: a.string(),
      departmentId: a.id(),
      ownerSub: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']),
      allow.ownerDefinedIn('ownerSub').to(['read']),
    ]),

  UserRole: a
    .model({
      userId: a.id().required(),
      roleId: a.id().required(),
    })
    .authorization((allow) => [allow.groups(['ADMIN'])]),

  inviteUser: a
    .mutation()
    .arguments({
      username: a.string().required(),
      email: a.string().required(),
      temporaryPassword: a.string().required(),
      groupName: a.string(),
    })
    .returns(
      a.customType({
        username: a.string(),
        cognitoUsername: a.string(),
        status: a.string(),
        message: a.string(),
      }),
    )
    .authorization((allow) => [allow.groups(['ADMIN'])])
    .handler(a.handler.function(adminManagementFunction)),

  adminDeleteUser: a
    .mutation()
    .arguments({
      cognitoUsername: a.string(),
      email: a.string(),
    })
    .returns(
      a.customType({
        username: a.string(),
        status: a.string(),
        message: a.string(),
      }),
    )
    .authorization((allow) => [allow.groups(['ADMIN'])])
    .handler(a.handler.function(adminManagementFunction)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
