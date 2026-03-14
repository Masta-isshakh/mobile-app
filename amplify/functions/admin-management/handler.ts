import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

type InviteArgs = {
  username: string;
  email: string;
  temporaryPassword?: string;
  groupName?: string;
};

type DeleteArgs = {
  cognitoUsername?: string;
  email?: string;
};

type ResolverEvent = {
  arguments: InviteArgs & DeleteArgs;
  info?: {
    fieldName?: string;
  };
  identity?: {
    groups?: string[];
    claims?: {
      [key: string]: unknown;
      'cognito:groups'?: string[] | string;
    };
  };
};

const client = new CognitoIdentityProviderClient({});

function getGroups(event: ResolverEvent): string[] {
  const groups = new Set<string>(event.identity?.groups ?? []);
  const claimsGroups = event.identity?.claims?.['cognito:groups'];

  if (Array.isArray(claimsGroups)) {
    for (const group of claimsGroups) {
      if (typeof group === 'string' && group.trim()) {
        groups.add(group.trim());
      }
    }
  } else if (typeof claimsGroups === 'string' && claimsGroups.trim()) {
    // Some identity providers serialize groups as a single comma-separated claim.
    for (const group of claimsGroups.split(',')) {
      const normalized = group.trim();
      if (normalized) {
        groups.add(normalized);
      }
    }
  }

  return [...groups];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function inviteUser(event: ResolverEvent, userPoolId: string) {
  const { username, email, temporaryPassword, groupName } = event.arguments;
  const normalizedEmail = normalizeEmail(email);
  const cognitoUsername = normalizedEmail;
  const targetGroup = groupName?.trim() || 'FREELANCER';

  let invitationStatus: 'SENT' | 'RESENT' = 'SENT';

  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: cognitoUsername,
        ...(temporaryPassword?.trim() ? { TemporaryPassword: temporaryPassword.trim() } : {}),
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          { Name: 'email', Value: normalizedEmail },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'preferred_username', Value: username.trim() },
        ],
      }),
    );
  } catch (error: unknown) {
    const name = (error as { name?: string }).name;
    if (name !== 'UsernameExistsException') {
      throw error;
    }

    invitationStatus = 'RESENT';
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: cognitoUsername,
        ...(temporaryPassword?.trim() ? { TemporaryPassword: temporaryPassword.trim() } : {}),
        MessageAction: 'RESEND',
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          { Name: 'email', Value: normalizedEmail },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'preferred_username', Value: username.trim() },
        ],
      }),
    );
  }

  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: cognitoUsername,
      GroupName: targetGroup,
    }),
  );

  return {
    username,
    cognitoUsername,
    status: 'INVITED',
    message:
      invitationStatus === 'SENT'
        ? `Invitation email sent to ${normalizedEmail}.`
        : `User already existed. Invitation email resent to ${normalizedEmail}.`,
  };
}

async function adminDeleteUser(event: ResolverEvent, userPoolId: string) {
  const { cognitoUsername, email } = event.arguments;
  const usernameToDelete = cognitoUsername?.trim() || (email ? normalizeEmail(email) : '');

  if (!usernameToDelete) {
    throw new Error('Either cognitoUsername or email is required to delete a user.');
  }

  try {
    await client.send(
      new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: usernameToDelete,
      }),
    );
  } catch (error: unknown) {
    const name = (error as { name?: string }).name;
    if (name !== 'UserNotFoundException') {
      throw error;
    }
  }

  return {
    username: usernameToDelete,
    status: 'DELETED',
    message: `User ${usernameToDelete} deleted in Cognito.`,
  };
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

  const fieldName = event.info?.fieldName;
  if (fieldName === 'adminDeleteUser') {
    return adminDeleteUser(event, userPoolId);
  }

  return inviteUser(event, userPoolId);
};
