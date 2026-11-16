import { searchAirports as searchLocalAirports, type AirportEntry } from '../../server/airports';
import { DemoSupplierProvider } from '../../server/suppliers/demoProvider';
import type {
  FareRevalidationResult,
  FlightOfferResult,
  FlightSearchParams,
} from '../../server/suppliers/types';

export type { AirportEntry };

const demoProvider = new DemoSupplierProvider();

export function searchAirportsFallback(query: string): AirportEntry[] {
  return searchLocalAirports(query);
}

export async function searchFlightsStaticFallback(params: FlightSearchParams): Promise<{
  mode: 'demo' | 'live';
  hasLiveSupplier: boolean;
  offers: FlightOfferResult[];
  notice: string;
}> {
  if (params.mode === 'live') {
    return {
      mode: 'live',
      hasLiveSupplier: false,
      offers: [],
      notice:
        'Live Mode — Manual Agency Quotation Workflow active. Submit a Custom Flight Request or select an agency-published quotation below.',
    };
  }

  const demoOffers = await demoProvider.searchFlights(params);
  return {
    mode: 'demo',
    hasLiveSupplier: false,
    offers: demoOffers,
    notice:
      'Demo Mode Active: Showing clearly labeled sample flights for booking workflow evaluation. Real bookings submitted here are handled by our ticketing desk.',
  };
}

export async function revalidateOfferStaticFallback(
  offer: FlightOfferResult
): Promise<FareRevalidationResult> {
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

  return demoProvider.revalidateFare(offer);
}
