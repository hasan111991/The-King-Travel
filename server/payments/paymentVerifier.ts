import crypto from 'node:crypto';

export interface GatewayConfigStatus {
  stripeConfigured: boolean;
  payfastConfigured: boolean;
  webhookSecretConfigured: boolean;
}

export function getPaymentGatewayStatus(): GatewayConfigStatus {
  return {
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    payfastConfigured: Boolean(
      process.env.PAYFAST_PK_MERCHANT_ID?.trim() && process.env.PAYFAST_PK_SECURED_KEY?.trim()
    ),
    webhookSecretConfigured: Boolean(process.env.PAYMENT_WEBHOOK_SECRET?.trim()),
  };
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) {
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export async function initiateOnlinePaymentSession(params: {
  bookingId: string;
  bookingReference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  gateway: 'card_stripe' | 'card_payfast';
  appUrl: string;
}): Promise<{
  configured: boolean;
  mode: 'live_gateway' | 'unconfigured';
  message: string;
  checkoutUrl?: string;
  sessionId?: string;
}> {
  if (params.gateway === 'card_stripe' && process.env.STRIPE_SECRET_KEY?.trim()) {
    const body = new URLSearchParams({
      mode: 'payment',
      success_url: `${params.appUrl}/booking/${params.bookingId}?payment=gateway_pending`,
      cancel_url: `${params.appUrl}/booking/${params.bookingId}?payment=cancelled`,
      customer_email: params.customerEmail,
      'line_items[0][price_data][currency]': params.currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': `Flight Booking ${params.bookingReference}`,
      'line_items[0][price_data][unit_amount]': String(Math.round(params.amount * 100)),
      'line_items[0][quantity]': '1',
      'metadata[bookingId]': params.bookingId,
      'metadata[bookingReference]': params.bookingReference,
    });

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY.trim()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Stripe checkout session error: ${errText}`);
    }

    const session = (await resp.json()) as { id: string; url: string };
    return {
      configured: true,
      mode: 'live_gateway',
      sessionId: session.id,
      checkoutUrl: session.url,
      message: 'Redirecting to secure Stripe Checkout. Confirmation occurs via server webhook.',
    };
  }

  return {
    configured: false,
    mode: 'unconfigured',
    message:
      'Online card gateway credentials are not yet configured on the server. Please select Bank Transfer, JazzCash, or Easypaisa and upload your payment receipt for admin verification.',
  };
}
