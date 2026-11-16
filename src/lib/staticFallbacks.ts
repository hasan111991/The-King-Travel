import { searchAirports as searchLocalAirports, type AirportEntry } from '../../server/airports';
import type {
  FareRevalidationResult,
  FlightOfferResult,
  FlightSearchParams,
} from '../../server/suppliers/types';

export type { AirportEntry };

export function searchAirportsFallback(query: string): AirportEntry[] {
  return searchLocalAirports(query);
}

export async function searchFlightsStaticFallback(_params: FlightSearchParams): Promise<{
  mode: 'live';
  hasLiveSupplier: boolean;
  offers: FlightOfferResult[];
  notice: string;
}> {
  return {
    mode: 'live',
    hasLiveSupplier: false,
    offers: [],
    notice:
      'Live airline GDS API credentials are not active on static hosting. Review published Agency Flight Offers below or submit a Custom Flight Request to receive airline fare quotations from our ticketing specialists.',
  };
}

export async function revalidateOfferStaticFallback(
  offer: FlightOfferResult
): Promise<FareRevalidationResult> {
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
        'Published agency quotation fare. Final seat availability and fare rules are verified by our ticketing desk prior to e-ticket issuance.',
    };
  }

  throw new Error('Live supplier API revalidation is unavailable on static hosting.');
}
