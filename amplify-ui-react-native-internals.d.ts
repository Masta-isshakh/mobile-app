declare module '@aws-amplify/ui-react-native/lib/Authenticator/common' {
  import type React from 'react';

  export const DefaultContent: React.ComponentType<Record<string, unknown> & {
    body?: React.ReactNode;
  }>;
}

declare module '@aws-amplify/ui-react-native/lib/Authenticator/hooks' {
  export function useFieldValues(input: {
    componentName: string;
    fields: unknown[];
    handleBlur?: (...args: never[]) => void;
    handleChange?: (...args: never[]) => void;
    handleSubmit?: (...args: never[]) => void;
    validationErrors?: unknown;
  }): {
    disableFormSubmit: boolean;
    fields: unknown[];
    fieldValidationErrors?: unknown;
    handleFormSubmit: () => void;
  };
}