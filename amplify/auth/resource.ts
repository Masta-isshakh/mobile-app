import { defineAuth } from '@aws-amplify/backend';
import { blockPublicSignUp } from '../functions/block-public-sign-up/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
  loginWith: {
    email: {
      userInvitation: {
        emailSubject: 'Your account for my_amplify_app is ready',
        emailBody: (username, code) =>
          [
            'An administrator created your account for my_amplify_app.',
            '',
            `Username: ${username()}`,
            `Temporary password: ${code()}`,
            '',
            'Open the app, sign in with the credentials above, and change your password when prompted.',
          ].join('\n'),
      },
    },
  },
  accountRecovery: 'NONE',
  groups: ['ADMIN', 'FREELANCER'],
  triggers: {
    preSignUp: blockPublicSignUp,
  },
});
