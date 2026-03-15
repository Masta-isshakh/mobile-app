import type { ReactElement } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

type Props = {
  publishableKey: string;
  children: ReactElement | ReactElement[];
};

export function StripeProviderBridge({ publishableKey, children }: Props) {
  return <StripeProvider publishableKey={publishableKey}>{children}</StripeProvider>;
}
