import { defineFunction } from '@aws-amplify/backend';

export const paypalCheckoutFunction = defineFunction({
  name: 'paypal-checkout-function',
  entry: './handler.ts',
  runtime: 20,
  resourceGroupName: 'data',
  environment: {
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID ?? '',
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET ?? '',
    PAYPAL_ENV: process.env.PAYPAL_ENV ?? 'sandbox',
  },
});
