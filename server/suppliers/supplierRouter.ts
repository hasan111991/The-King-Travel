import { AmadeusSupplierProvider } from './amadeusProvider.ts';
import { DemoSupplierProvider } from './demoProvider.ts';
import { DuffelSupplierProvider } from './duffelProvider.ts';
import type {
  FareRevalidationResult,
  FlightOfferResult,
  FlightSearchParams,
  SupplierStatus,
} from './types.ts';

const amadeus = new AmadeusSupplierProvider();
const duffel = new DuffelSupplierProvider();
const demo = new DemoSupplierProvider();

export function getSupplierStatuses(): SupplierStatus[] {
  return [
    {
      provider: 'amadeus',
      name: amadeus.name,
      configured: amadeus.isConfigured(),
      environment: process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com',
    },
    {
      provider: 'duffel',
      name: duffel.name,
      configured: duffel.isConfigured(),
      environment: process.env.DUFFEL_BASE_URL || 'https://api.duffel.com',
    },
  ];
}

export async function searchSupplierFlights(params: FlightSearchParams): Promise<{
  mode: 'demo' | 'live';
  hasLiveSupplier: boolean;
  offers: FlightOfferResult[];
  notice: string;
}> {
  const hasLiveSupplier = amadeus.isConfigured() || duffel.isConfigured();

  if (params.mode === 'live' && hasLiveSupplier) {
    const results: FlightOfferResult[] = [];
    const errors: string[] = [];

    if (amadeus.isConfigured()) {
      try {
        const amadeusOffers = await amadeus.searchFlights(params);
        results.push(...amadeusOffers);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Amadeus search failed');
      }
    }

    if (duffel.isConfigured()) {
      try {
        const duffelOffers = await duffel.searchFlights(params);
        results.push(...duffelOffers);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Duffel search failed');
      }
    }

    if (results.length > 0) {
      return {
        mode: 'live',
        hasLiveSupplier: true,
        offers: results,
        notice: 'Live flight offers retrieved from authorized supplier APIs.',
      };
    }

    return {
      mode: 'live',
      hasLiveSupplier: true,
      offers: [],
      notice:
        errors.length > 0
          ? `Supplier API notice: ${errors.join(' | ')}. You may submit a manual quotation request.`
          : 'No live supplier seats matched this route/date. Submit a manual quotation request below.',
    };
  }

  if (params.mode === 'live' && !hasLiveSupplier) {
    return {
      mode: 'live',
      hasLiveSupplier: false,
      offers: [],
      notice:
        'Live booking mode is active, but no supplier API credentials (Amadeus or Duffel) are configured on the server yet. Customers can review manual agency offers or submit a quotation booking request.',
    };
  }

  const demoOffers = await demo.searchFlights(params);
  return {
    mode: 'demo',
    hasLiveSupplier,
    offers: demoOffers,
    notice:
      'Demo Mode Active: Showing clearly labeled sample flights for booking workflow evaluation. Configure Amadeus or Duffel API keys on the server for live airline inventory.',
  };
}

export async function revalidateOfferFare(offer: FlightOfferResult): Promise<FareRevalidationResult> {
  if (offer.provider === 'amadeus' && amadeus.isConfigured()) {
    return amadeus.revalidateFare(offer);
  }
  if (offer.provider === 'duffel' && duffel.isConfigured()) {
    return duffel.revalidateFare(offer);
  }
  if (offer.provider === 'manual_offer') {
    return {
      offerId: offer.id,
      provider: 'Manual Agency Quotation',
      available: true,
      isDemo: false,
      estimatedPrice: offer.totalPrice,
      confirmedPrice: offer.totalPrice,
      priceChanged: false,
      currency: offer.currency,
      fareBreakdown: offer.fareBreakdown,
      revalidatedAt: new Date().toISOString(),
      message:
        'Estimated agency quotation fare. Final confirmed supplier fare will be locked by our ticketing desk prior to e-ticket issuance.',
    };
  }
  return demo.revalidateFare(offer);
}
