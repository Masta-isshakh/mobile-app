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
      category: a.enum(['SURVEILLANCE', 'ACCESS_CONTROL', 'SAFETY', 'POWER', 'OTHER']),
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

  CartItem: a
    .model({
      productId: a.id().required(),
      productName: a.string().required(),
      productPrice: a.float(),
      productImageUrl: a.string(),
      creatorUsername: a.string(),
      quantity: a.integer().required(),
      ownerSub: a.string().required(),
      ownerUsername: a.string().required(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read']),
      allow.ownerDefinedIn('ownerSub').to(['create', 'read', 'update', 'delete']),
    ]),

  LoyaltyAccount: a
    .model({
      ownerSub: a.string().required(),
      ownerUsername: a.string().required(),
      pointsBalance: a.integer().default(0),
      tier: a.enum(['MEMBER', 'SILVER', 'GOLD', 'PLATINUM']),
      lifetimeSpendQar: a.float().default(0),
      lifetimeOrders: a.integer().default(0),
      lastEarnedAt: a.datetime(),
      lastRedeemedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'update']),
      allow.ownerDefinedIn('ownerSub').to(['create', 'read', 'update']),
    ]),

  LoyaltyLedger: a
    .model({
      ownerSub: a.string().required(),
      ownerUsername: a.string().required(),
      orderId: a.id(),
      entryType: a.enum(['EARN', 'REDEEM', 'ADJUST']),
      pointsDelta: a.integer().required(),
      description: a.string().required(),
      tierSnapshot: a.enum(['MEMBER', 'SILVER', 'GOLD', 'PLATINUM']),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'create', 'update']),
      allow.ownerDefinedIn('ownerSub').to(['create', 'read']),
    ]),

  SalesOrder: a
    .model({
      orderNumber: a.string().required(),
      ownerSub: a.string().required(),
      ownerUsername: a.string().required(),
      customerName: a.string().required(),
      customerPhone: a.string().required(),
      companyName: a.string(),
      qidReference: a.string(),
      deliveryAddress: a.string(),
      deliveryMode: a.enum(['DELIVERY', 'SELF_PICKUP']),
      fulfillmentStatus: a.enum(['PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COLLECTED', 'CANCELLED']),
      paymentMethod: a.enum(['STRIPE', 'PAYPAL']),
      paymentStatus: a.enum(['PAID', 'REFUNDED']),
      subtotalQar: a.float().required(),
      deliveryFeeQar: a.float().default(0),
      loyaltyDiscountQar: a.float().default(0),
      totalQar: a.float().required(),
      loyaltyPointsEarned: a.integer().default(0),
      loyaltyPointsRedeemed: a.integer().default(0),
      warrantyCardsIssued: a.integer().default(0),
      note: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'update']),
      allow.ownerDefinedIn('ownerSub').to(['create', 'read']),
    ]),

  SalesOrderItem: a
    .model({
      orderId: a.id().required(),
      ownerSub: a.string().required(),
      productId: a.id().required(),
      productName: a.string().required(),
      productCategory: a.enum(['SURVEILLANCE', 'ACCESS_CONTROL', 'SAFETY', 'POWER', 'OTHER']),
      creatorUsername: a.string(),
      quantity: a.integer().required(),
      unitPriceQar: a.float().required(),
      lineTotalQar: a.float().required(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read']),
      allow.ownerDefinedIn('ownerSub').to(['create', 'read']),
    ]),

  DeliveryNote: a
    .model({
      orderId: a.id().required(),
      orderNumber: a.string().required(),
      ownerSub: a.string().required(),
      ownerUsername: a.string().required(),
      noteNumber: a.string().required(),
      deliveryMode: a.enum(['DELIVERY', 'SELF_PICKUP']),
      status: a.enum(['DRAFT', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COLLECTED']),
      recipientName: a.string().required(),
      customerPhone: a.string().required(),
      deliveryAddress: a.string(),
      companyName: a.string(),
      qidReference: a.string(),
      signatureName: a.string(),
      signedAt: a.datetime(),
      noteText: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'update']),
      allow.ownerDefinedIn('ownerSub').to(['create', 'read']),
    ]),

  WarrantyCard: a
    .model({
      orderId: a.id().required(),
      orderItemId: a.id().required(),
      ownerSub: a.string().required(),
      ownerUsername: a.string().required(),
      cardNumber: a.string().required(),
      productId: a.id().required(),
      productName: a.string().required(),
      productCategory: a.enum(['SURVEILLANCE', 'ACCESS_CONTROL', 'SAFETY', 'POWER', 'OTHER']),
      warrantyMonths: a.integer().required(),
      warrantyStartDate: a.datetime().required(),
      warrantyEndDate: a.datetime().required(),
      status: a.enum(['ACTIVE', 'EXPIRED', 'VOID']),
      coverageSummary: a.string().required(),
      customerName: a.string().required(),
      customerPhone: a.string().required(),
      companyName: a.string(),
      qidReference: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'update']),
      allow.ownerDefinedIn('ownerSub').to(['create', 'read']),
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
