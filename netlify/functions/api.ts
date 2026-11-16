import { searchAirports } from '../../server/airports';
import {
  dispatchCustomerNotification,
  type NotificationDispatchPayload,
} from '../../server/notifications/notificationDispatcher';
import {
  getPaymentGatewayStatus,
  initiateOnlinePaymentSession,
  verifyWebhookSignature,
} from '../../server/payments/paymentVerifier';
import {
  getSupplierStatuses,
  revalidateOfferFare,
  searchSupplierFlights,
} from '../../server/suppliers/supplierRouter';
import type { FlightOfferResult, FlightSearchParams } from '../../server/suppliers/types';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function parseJsonBody(req: Request): Promise<{ parsed: any; rawBody: string }> {
  const rawBody = await req.text();
  if (!rawBody) return { parsed: {}, rawBody: '' };
  try {
    return { parsed: JSON.parse(rawBody), rawBody };
  } catch {
    return { parsed: {}, rawBody };
  }
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.pathname
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '') || '/';
  const method = req.method.toUpperCase();

  try {
    // Health & Integration Status (never exposes secret values)
    if (method === 'GET' && (subPath === '/health' || subPath === '/')) {
      return json({
        ok: true,
        service: 'the-king-travel-netlify-api',
        timestamp: new Date().toISOString(),
      });
    }

    if (method === 'GET' && subPath === '/integrations/status') {
      return json({
        suppliers: getSupplierStatuses(),
        payments: getPaymentGatewayStatus(),
        notifications: {
          emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
          whatsappConfigured: Boolean(
            process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() &&
              process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
          ),
        },
      });
    }

    // Airport Autocomplete
    if (method === 'GET' && subPath === '/flights/airports') {
      const query = url.searchParams.get('q') || '';
      return json({ airports: searchAirports(query) });
    }

    // Flight Search through Supplier Abstraction Layer
    if (method === 'POST' && subPath === '/flights/search') {
      const { parsed } = await parseJsonBody(req);
      const body = (parsed || {}) as Partial<FlightSearchParams>;
      const origin = (body.originCode || '').trim().toUpperCase();
      const destination = (body.destinationCode || '').trim().toUpperCase();

      if (!origin || !destination) {
        return json({ error: 'Departure and destination airports are required.' }, 400);
      }
      if (origin === destination) {
        return json({ error: 'Departure and destination cannot be identical.' }, 400);
      }
      if (!body.departureDate) {
        return json({ error: 'Departure date is required.' }, 400);
      }

      const params: FlightSearchParams = {
        tripType: body.tripType || 'round-trip',
        originCode: origin,
        destinationCode: destination,
        departureDate: body.departureDate,
        returnDate: body.returnDate,
        legs: body.legs,
        adults: Math.max(1, Math.min(9, Number(body.adults || 1))),
        children: Math.max(0, Math.min(8, Number(body.children || 0))),
        infants: Math.max(0, Math.min(4, Number(body.infants || 0))),
        cabinClass: body.cabinClass || 'Economy',
        currency: body.currency || 'USD',
        mode: body.mode === 'live' ? 'live' : 'demo',
      };

      const result = await searchSupplierFlights(params);
      return json(result);
    }

    // Fare Revalidation
    if (method === 'POST' && subPath === '/flights/revalidate') {
      const { parsed } = await parseJsonBody(req);
      const offer = parsed?.offer as FlightOfferResult | undefined;
      if (!offer || !offer.id) {
        return json({ error: 'Valid flight offer payload is required.' }, 400);
      }
      const result = await revalidateOfferFare(offer);
      return json(result);
    }

    // Server-side Payment Gateway Checkout Session
    if (method === 'POST' && subPath === '/payments/gateway-session') {
      const { parsed } = await parseJsonBody(req);
      const { bookingId, bookingReference, amount, currency, customerEmail, gateway } = parsed || {};
      if (!bookingId || !bookingReference || !amount || !customerEmail) {
        return json({ error: 'Missing required payment session parameters.' }, 400);
      }
      const appUrl =
        process.env.APP_URL?.trim() ||
        process.env.URL?.trim() ||
        `${url.protocol}//${url.host}`;
      const session = await initiateOnlinePaymentSession({
        bookingId,
        bookingReference,
        amount: Number(amount),
        currency: String(currency || 'USD'),
        customerEmail: String(customerEmail),
        gateway: gateway === 'card_payfast' ? 'card_payfast' : 'card_stripe',
        appUrl,
      });
      return json(session);
    }

    // Payment Webhook Signature Verification
    if (method === 'POST' && subPath === '/payments/webhook') {
      const signature =
        req.headers.get('x-kingtravel-signature') ||
        req.headers.get('stripe-signature') ||
        undefined;
      const { rawBody } = await parseJsonBody(req);
      if (!verifyWebhookSignature(rawBody, signature)) {
        return json({ error: 'Invalid or unconfigured webhook signature.' }, 401);
      }
      return json({
        received: true,
        verified: true,
        processedAt: new Date().toISOString(),
      });
    }

    // Notification Dispatch
    if (method === 'POST' && subPath === '/notifications/dispatch') {
      const { parsed } = await parseJsonBody(req);
      const payload = parsed as NotificationDispatchPayload;
      if (!payload?.recipientEmail || !payload?.bookingReference || !payload?.eventType) {
        return json({ error: 'Missing notification fields.' }, 400);
      }
      const result = await dispatchCustomerNotification(payload);
      return json(result);
    }

    // Flight Request Agency Notification
    if (method === 'POST' && subPath === '/flight-requests/notify-agency') {
      const { parsed } = await parseJsonBody(req);
      const body = parsed || {};
      const requestReference = String(body.requestReference || '').trim();
      const passengerName = String(body.passengerName || '').trim();
      const email = String(body.email || '').trim();
      const departureCity = String(body.departureCity || '').trim();
      const destinationCity = String(body.destinationCity || '').trim();

      if (!requestReference || !passengerName || !email || !departureCity || !destinationCity) {
        return json({ error: 'Missing required flight request notification details.' }, 400);
      }

      const rawAgencyEmail = typeof body.agencyEmail === 'string' ? body.agencyEmail.trim() : '';
      const targetAgencyEmail =
        rawAgencyEmail && rawAgencyEmail.includes('@')
          ? rawAgencyEmail
          : process.env.AGENCY_EMAIL?.trim() || 'thekingtravel22@gmail.com';

      const pax = body.passengersCount || { adults: 1, children: 0, infants: 0 };
      const paxSummary = `${pax.adults || 1} Adult(s), ${pax.children || 0} Child(ren), ${pax.infants || 0} Infant(s)`;

      const agencyMessage = [
        'New customer flight booking request submitted via The King Travel portal.',
        `Trip Type: ${body.tripType || 'round-trip'} | Cabin: ${body.cabinClass || 'Economy'}`,
        `Route: ${departureCity} -> ${destinationCity}`,
        `Departure Date: ${body.departureDate || '-'}${body.returnDate ? ` | Return Date: ${body.returnDate}` : ''}`,
        body.segmentsSummary ? `Multi-City Segments:\n${body.segmentsSummary}` : '',
        `Preferred Airline: ${body.preferredAirline || 'Any Airline'}`,
        `Passengers: ${paxSummary}`,
        `Customer: ${passengerName} (${email} | ${body.phoneWhatsapp || 'N/A'})`,
        body.additionalRequirements ? `Requirements: ${body.additionalRequirements}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const agencyNotification = await dispatchCustomerNotification({
        eventType: 'New Flight Request',
        bookingReference: requestReference,
        recipientEmail: targetAgencyEmail,
        customerName: 'The King Travel Ticketing Desk',
        subject: `New Flight Request: ${departureCity} -> ${destinationCity} (${passengerName})`,
        message: agencyMessage,
      });

      const customerNotification = await dispatchCustomerNotification({
        eventType: 'New Flight Request',
        bookingReference: requestReference,
        recipientEmail: email,
        recipientPhone: typeof body.phoneWhatsapp === 'string' ? body.phoneWhatsapp : undefined,
        customerName: passengerName,
        subject: 'Flight Booking Request Received',
        message: `We have received your flight request (${departureCity} -> ${destinationCity}, ${body.departureDate || ''}). Our ticketing specialists are checking authorized airline suppliers and will prepare tailored fare quotations for your review shortly.`,
      });

      return json({
        ok: true,
        requestReference,
        targetAgencyEmail,
        agencyNotification,
        customerNotification,
      });
    }

    return json({ error: `Not found: ${method} ${subPath}` }, 404);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      500
    );
  }
}
