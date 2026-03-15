import { useStripe } from '@stripe/stripe-react-native';

export function useStripeBridge() {
  return useStripe();
}
