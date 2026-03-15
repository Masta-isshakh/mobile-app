import Stripe from 'stripe';

type ResolverEvent = {
  arguments: {
    amountCents: number;
    currency?: string;
    customerEmail?: string;
    orderSummary?: string;
  };
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

export const handler = async (event: ResolverEvent) => {
  if (!stripe) {
    throw new Error('Stripe is not configured on backend. Set STRIPE_SECRET_KEY.');
  }
  if (!stripePublishableKey) {
    throw new Error('Stripe publishable key is not configured on backend. Set STRIPE_PUBLISHABLE_KEY.');
  }

  const amountCents = Number(event.arguments.amountCents);
  const currency = (event.arguments.currency || 'usd').toLowerCase();

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer.');
  }

  const customer = await stripe.customers.create({
    email: event.arguments.customerEmail || undefined,
    description: 'Amplify app checkout customer',
  });

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: '2024-06-20' },
  );

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customer.id,
    automatic_payment_methods: { enabled: true },
    description: event.arguments.orderSummary || 'Cart checkout',
    receipt_email: event.arguments.customerEmail || undefined,
    metadata: {
      source: 'my_amplify_app',
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    customerId: customer.id,
    ephemeralKeySecret: ephemeralKey.secret,
    paymentIntentId: paymentIntent.id,
    publishableKey: stripePublishableKey,
  };
};
