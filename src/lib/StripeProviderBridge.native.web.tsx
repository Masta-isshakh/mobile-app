import type { ReactElement } from 'react';

type Props = {
  publishableKey: string;
  children: ReactElement | ReactElement[];
};

export function StripeProviderBridge({ children }: Props) {
  return <>{children}</>;
}
