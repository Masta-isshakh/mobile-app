import { defineFunction } from '@aws-amplify/backend';

export const adminManagementFunction = defineFunction({
  name: 'admin-management-function',
  entry: './handler.ts',
  runtime: 20,
  resourceGroupName: 'data',
});
