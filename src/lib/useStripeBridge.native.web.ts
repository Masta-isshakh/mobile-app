type PaymentError = {
  code?: string;
  message?: string;
};

type PaymentResult = {
  error?: PaymentError;
};

export function useStripeBridge() {
  return {
    initPaymentSheet: async () => {
      return { error: { code: 'Unavailable', message: 'Stripe is not available on web for this app build.' } } as PaymentResult;
    },
    presentPaymentSheet: async () => {
      return { error: { code: 'Unavailable', message: 'Stripe is not available on web for this app build.' } } as PaymentResult;
    },
  };
}
