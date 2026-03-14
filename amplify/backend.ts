import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
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

backend.adminManagementFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminDeleteUser',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  }),
);
