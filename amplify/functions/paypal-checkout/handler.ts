type ResolverEvent = {
  arguments: {
    amount: string;
    currency?: string;
    orderSummary?: string;
    orderId?: string;
  };
  info?: {
    fieldName?: string;
  };
};

type PayPalAccessTokenResponse = {
  access_token: string;
};

type PayPalLink = {
  href: string;
  rel: string;
  method?: string;
};

type PayPalCreateOrderResponse = {
  id: string;
  status: string;
  links?: PayPalLink[];
};

type PayPalCaptureResponse = {
  id: string;
  status: string;
};

function getBaseUrl(): string {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
  }

  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Unable to authenticate with PayPal.');
  }

  const data = (await response.json()) as PayPalAccessTokenResponse;
  return data.access_token;
}

async function createOrder(event: ResolverEvent) {
  const accessToken = await getAccessToken();
  const amount = Number.parseFloat(event.arguments.amount);
  const currency = (event.arguments.currency || 'USD').toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('PayPal amount must be a positive number.');
  }

  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: event.arguments.orderSummary || 'Cart checkout',
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        user_action: 'PAY_NOW',
        return_url: 'https://example.com/paypal/success',
        cancel_url: 'https://example.com/paypal/cancel',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to create PayPal order. ${errorText}`);
  }

  const data = (await response.json()) as PayPalCreateOrderResponse;
  const approvalUrl = data.links?.find((link) => link.rel === 'approve')?.href;

  if (!approvalUrl) {
    throw new Error('PayPal approval URL was not returned.');
  }

  return {
    orderId: data.id,
    approvalUrl,
    status: data.status,
  };
}

async function captureOrder(event: ResolverEvent) {
  const orderId = event.arguments.orderId?.trim();
  if (!orderId) {
    throw new Error('orderId is required to capture a PayPal order.');
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to capture PayPal order. ${errorText}`);
  }

  const data = (await response.json()) as PayPalCaptureResponse;
  return {
    orderId: data.id,
    status: data.status,
  };
}

export const handler = async (event: ResolverEvent) => {
  if (event.info?.fieldName === 'capturePayPalOrder') {
    return captureOrder(event);
  }

  return createOrder(event);
};
