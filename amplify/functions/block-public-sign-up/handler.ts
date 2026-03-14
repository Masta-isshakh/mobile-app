type PreSignUpEvent = {
  triggerSource: string;
  response: {
    autoConfirmUser: boolean;
    autoVerifyEmail: boolean;
    autoVerifyPhone: boolean;
  };
};

export const handler = async (event: PreSignUpEvent): Promise<PreSignUpEvent> => {
  if (event.triggerSource === 'PreSignUp_AdminCreateUser') {
    return event;
  }

  throw new Error('Self-service sign-up is disabled. Contact an administrator to create your account.');
};