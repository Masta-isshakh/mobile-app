import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

type InviteArgs = {
  username: string;
  email: string;
  temporaryPassword: string;
  groupName?: string;
};

type ResolverEvent = {
  arguments: InviteArgs;
  identity?: {
    groups?: string[];
    claims?: {
      [key: string]: unknown;
      'cognito:groups'?: string[];
    };
  };
};

const client = new CognitoIdentityProviderClient({});

function getGroups(event: ResolverEvent): string[] {
  const groupsFromIdentity = event.identity?.groups ?? [];
  const claimsGroups = event.identity?.claims?.['cognito:groups'];
  if (Array.isArray(claimsGroups)) {
    return [...groupsFromIdentity, ...claimsGroups];
  }
  return groupsFromIdentity;
}

export const handler = async (event: ResolverEvent) => {
  const groups = getGroups(event);
  if (!groups.includes('ADMIN')) {
    throw new Error('Not authorized. ADMIN role is required.');
  }

  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('USER_POOL_ID environment variable is not configured.');
  }

  const { username, email, temporaryPassword, groupName } = event.arguments;

  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      TemporaryPassword: temporaryPassword,
      DesiredDeliveryMediums: ['EMAIL'],
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
    }),
  );

  const targetGroup = groupName?.trim() || 'FREELANCER';

  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: targetGroup,
    }),
  );

  return {
    username,
    status: 'INVITED',
    message: `User ${username} invited successfully in ${targetGroup}.`,
  };
};
