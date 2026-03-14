import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { adminManagementFunction } from './functions/admin-management/resource';
import { blockPublicSignUp } from './functions/block-public-sign-up/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  adminManagementFunction,
  blockPublicSignUp,
});

backend.adminManagementFunction.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
