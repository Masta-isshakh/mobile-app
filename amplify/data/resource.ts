import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { adminManagementFunction } from '../functions/admin-management/resource';
import { paypalCheckoutFunction } from '../functions/paypal-checkout/resource';
import { stripeCheckoutFunction } from '../functions/stripe-checkout/resource';

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
      departmentId: a.id(),
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

  ProductX: a
    .model({
      name: a.string().required(),
      price: a.float().default(0),
      description: a.string(),
      imageDataUrl: a.string(),
      creatorSub: a.string().required(),
      creatorUsername: a.string().required(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['create', 'read', 'update', 'delete']),
      allow.groups(['FREELANCER']).to(['read']),
      allow.ownerDefinedIn('creatorSub').to(['create', 'read', 'update', 'delete']),
    ]),

  StoreProduct: a
    .model({
      productId: a.id().required(),
      ownerSub: a.string().required(),
      ownerUsername: a.string().required(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'delete']),
      allow.ownerDefinedIn('ownerSub').to(['create', 'read', 'delete']),
    ]),

  ProductRating: a
    .model({
      productId: a.id().required(),
      userSub: a.string().required(),
      score: a.integer().required(),
      comment: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'delete']),
      allow.groups(['FREELANCER']).to(['read']),
      allow.ownerDefinedIn('userSub').to(['create', 'read', 'update', 'delete']),
    ]),

  inviteUser: a
    .mutation()
    .arguments({
      username: a.string().required(),
      email: a.string().required(),
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

  createCheckoutSession: a
    .mutation()
    .arguments({
      amountCents: a.integer().required(),
      currency: a.string(),
      customerEmail: a.string(),
      orderSummary: a.string(),
    })
    .returns(
      a.customType({
        clientSecret: a.string(),
        customerId: a.string(),
        ephemeralKeySecret: a.string(),
        paymentIntentId: a.string(),
        publishableKey: a.string(),
      }),
    )
    .authorization((allow) => [allow.groups(['ADMIN', 'FREELANCER'])])
    .handler(a.handler.function(stripeCheckoutFunction)),

  createPayPalOrder: a
    .mutation()
    .arguments({
      amount: a.string().required(),
      currency: a.string(),
      orderSummary: a.string(),
    })
    .returns(
      a.customType({
        orderId: a.string(),
        approvalUrl: a.string(),
        status: a.string(),
      }),
    )
    .authorization((allow) => [allow.groups(['ADMIN', 'FREELANCER'])])
    .handler(a.handler.function(paypalCheckoutFunction)),

  capturePayPalOrder: a
    .mutation()
    .arguments({
      orderId: a.string().required(),
    })
    .returns(
      a.customType({
        orderId: a.string(),
        status: a.string(),
      }),
    )
    .authorization((allow) => [allow.groups(['ADMIN', 'FREELANCER'])])
    .handler(a.handler.function(paypalCheckoutFunction)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
