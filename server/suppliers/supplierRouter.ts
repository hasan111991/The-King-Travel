import { AmadeusSupplierProvider } from './amadeusProvider.ts';
import { DuffelSupplierProvider } from './duffelProvider.ts';
import type {
  FareRevalidationResult,
  FlightOfferResult,
  FlightSearchParams,
  SupplierStatus,
} from './types.ts';

const amadeus = new AmadeusSupplierProvider();
const duffel = new DuffelSupplierProvider();

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
  mode: 'live';
  hasLiveSupplier: boolean;
  offers: FlightOfferResult[];
  notice: string;
}> {
  const hasLiveSupplier = amadeus.isConfigured() || duffel.isConfigured();

  if (hasLiveSupplier) {
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
          ? `Supplier API notice: ${errors.join(' | ')}. Please submit a Custom Flight Request below for manual agency ticketing assistance.`
          : 'No live supplier seats matched this route/date. Submit a Custom Flight Request below so our specialists can quote available airline options.',
    };
  }

  return {
    mode: 'live',
    hasLiveSupplier: false,
    offers: [],
    notice:
      'Live airline GDS API credentials (Amadeus or Duffel) are not configured on this server yet. Review published Agency Flight Offers below or submit a Custom Flight Request to receive tailored airline quotations.',
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
      provider: 'Agency Manual Quotation',
      available: true,
      isDemo: false,
      estimatedPrice: offer.totalPrice,
      confirmedPrice: offer.totalPrice,
      priceChanged: false,
      currency: offer.currency,
      fareBreakdown: offer.fareBreakdown,
      revalidatedAt: new Date().toISOString(),
      message:
        'Published agency quotation fare. Final seat availability and ticketing rules are confirmed by our Dallas ticketing desk prior to e-ticket issuance.',
    };
  }
  throw new Error('Live supplier credentials are not active to revalidate this offer.');
}
