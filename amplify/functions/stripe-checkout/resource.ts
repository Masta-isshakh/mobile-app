import { defineFunction } from '@aws-amplify/backend';

export const stripeCheckoutFunction = defineFunction({
  name: 'stripe-checkout-function',
  entry: './handler.ts',
  runtime: 20,
  resourceGroupName: 'data',
  environment: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  },
});
