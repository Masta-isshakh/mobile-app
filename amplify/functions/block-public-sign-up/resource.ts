import { defineFunction } from '@aws-amplify/backend';

export const blockPublicSignUp = defineFunction({
  name: 'block-public-sign-up',
  entry: './handler.ts',
  runtime: 20,
  resourceGroupName: 'auth',
});