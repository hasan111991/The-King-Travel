import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { searchAirports } from './server/airports.ts';
import {
  dispatchCustomerNotification,
  type NotificationDispatchPayload,
} from './server/notifications/notificationDispatcher.ts';
import {
  getPaymentGatewayStatus,
  initiateOnlinePaymentSession,
  verifyWebhookSignature,
} from './server/payments/paymentVerifier.ts';
import {
  getSupplierStatuses,
  revalidateOfferFare,
  searchSupplierFlights,
} from './server/suppliers/supplierRouter.ts';
import type { FlightOfferResult, FlightSearchParams } from './server/suppliers/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

// Simple sliding-window in-memory rate limiter for sensitive API endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before retrying.',
      });
    }
    bucket.count += 1;
    return next();
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // Preserve raw body for webhook signature verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health & Integration Status (never exposes secret values)
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'the-king-travel-api', timestamp: new Date().toISOString() });
  });

  app.get('/api/integrations/status', (_req, res) => {
    res.json({
      suppliers: getSupplierStatuses(),
      payments: getPaymentGatewayStatus(),
      notifications: {
        emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
        whatsappConfigured: Boolean(
          process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
        ),
      },
    });
  });

  // Airport Autocomplete
  app.get('/api/flights/airports', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    res.json({ airports: searchAirports(query) });
  });

  // Flight Search through Supplier Abstraction Layer
  app.post('/api/flights/search', rateLimit(40, 60_000), async (req, res) => {
    try {
      const body = req.body as Partial<FlightSearchParams>;
      const origin = (body.originCode || '').trim().toUpperCase();
      const destination = (body.destinationCode || '').trim().toUpperCase();

      if (!origin || !destination) {
        return res.status(400).json({ error: 'Departure and destination airports are required.' });
      }
      if (origin === destination) {
        return res.status(400).json({ error: 'Departure and destination cannot be identical.' });
      }
      if (!body.departureDate) {
        return res.status(400).json({ error: 'Departure date is required.' });
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
      return res.json(result);
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to search flights.',
      });
    }
  });

  // Fare Revalidation prior to booking confirmation
  app.post('/api/flights/revalidate', rateLimit(30, 60_000), async (req, res) => {
    try {
      const offer = req.body?.offer as FlightOfferResult | undefined;
      if (!offer || !offer.id) {
        return res.status(400).json({ error: 'Valid flight offer payload is required.' });
      }
      const result = await revalidateOfferFare(offer);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Fare revalidation failed.',
      });
    }
  });

  // Payment Gateway Checkout Session
  app.post('/api/payments/gateway-session', rateLimit(20, 60_000), async (req, res) => {
    try {
      const { bookingId, bookingReference, amount, currency, customerEmail, gateway } = req.body || {};
      if (!bookingId || !bookingReference || !amount || !customerEmail) {
        return res.status(400).json({ error: 'Missing required payment session parameters.' });
      }
      const appUrl =
        process.env.APP_URL?.trim() || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
      const session = await initiateOnlinePaymentSession({
        bookingId,
        bookingReference,
        amount: Number(amount),
        currency: String(currency || 'USD'),
        customerEmail: String(customerEmail),
        gateway: gateway === 'card_payfast' ? 'card_payfast' : 'card_stripe',
        appUrl,
      });
      return res.json(session);
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to create payment session.',
      });
    }
  });

  // Server-Side Payment Gateway Webhook (Signature-Verified)
  app.post('/api/payments/webhook', (req: any, res) => {
    const signature = req.header('x-kingtravel-signature') || req.header('stripe-signature');
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid or unconfigured webhook signature.' });
    }
    return res.json({ received: true, verified: true, processedAt: new Date().toISOString() });
  });

  // Notification Dispatch Endpoint
  app.post('/api/notifications/dispatch', rateLimit(30, 60_000), async (req, res) => {
    try {
      const payload = req.body as NotificationDispatchPayload;
      if (!payload?.recipientEmail || !payload?.bookingReference || !payload?.eventType) {
        return res.status(400).json({ error: 'Missing notification fields.' });
      }
      const result = await dispatchCustomerNotification(payload);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Notification dispatch failed.',
      });
    }
  });

  // Flight Booking Request -> Agency Email Notification + Customer Acknowledgment
  app.post('/api/flight-requests/notify-agency', rateLimit(25, 60_000), async (req, res) => {
    try {
      const body = req.body || {};
      const requestReference = String(body.requestReference || '').trim();
      const passengerName = String(body.passengerName || '').trim();
      const email = String(body.email || '').trim();
      const departureCity = String(body.departureCity || '').trim();
      const destinationCity = String(body.destinationCity || '').trim();

      if (!requestReference || !passengerName || !email || !departureCity || !destinationCity) {
        return res.status(400).json({ error: 'Missing required flight request notification details.' });
      }

      const rawAgencyEmail = typeof body.agencyEmail === 'string' ? body.agencyEmail.trim() : '';
      const targetAgencyEmail =
        rawAgencyEmail && rawAgencyEmail.includes('@')
          ? rawAgencyEmail
          : process.env.AGENCY_EMAIL?.trim() || 'thekingtravel22@gmail.com';

      const pax = body.passengersCount || { adults: 1, children: 0, infants: 0 };
      const paxSummary = `${pax.adults || 1} Adult(s), ${pax.children || 0} Child(ren), ${pax.infants || 0} Infant(s)`;

      const agencyMessage = [
        `New customer flight booking request submitted via The King Travel portal.`,
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

      return res.json({
        ok: true,
        requestReference,
        targetAgencyEmail,
        agencyNotification,
        customerNotification,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to dispatch agency notification.',
      });
    }
  });

  // SEO: Sitemap.xml & Robots.txt
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl =
      process.env.APP_URL?.trim() || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    const routes = [
      '/',
      '/flights',
      '/flight-request',
      '/hotels',
      '/hajj-umrah',
      '/packages',
      '/destinations',
      '/services',
      '/about',
      '/contact',
      '/terms',
      '/privacy',
      '/refund-policy',
      '/cancellation-policy',
      '/booking-conditions',
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${baseUrl.replace(/\/$/, '')}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  app.get('/robots.txt', (req, res) => {
    const baseUrl =
      process.env.APP_URL?.trim() || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    res.type('text/plain').send(
      `User-agent: *
Allow: /
Disallow: /admin
Disallow: /my-bookings
Disallow: /booking/
Sitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml
`
    );
  });

  // Frontend serving (Vite dev middleware or built dist/)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get(/\/assets\/([^/]+)$/, (req, res, next) => {
      const filePath = path.join(distDir, 'assets', req.params[0]);
      res.sendFile(filePath, (err) => {
        if (err) next();
      });
    });
    app.get(/\/official-logo\.png$/, (_req, res) => {
      res.sendFile(path.join(distDir, 'official-logo.png'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The King Travel server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
