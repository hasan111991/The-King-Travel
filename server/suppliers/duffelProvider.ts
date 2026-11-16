import type {
  FareRevalidationResult,
  FlightOfferResult,
  FlightSearchParams,
  FlightSupplierProvider,
} from './types.ts';

export class DuffelSupplierProvider implements FlightSupplierProvider {
  readonly id = 'duffel' as const;
  readonly name = 'Duffel Air API';

  private get accessToken(): string {
    return process.env.DUFFEL_ACCESS_TOKEN?.trim() || '';
  }

  private get baseUrl(): string {
    return (process.env.DUFFEL_BASE_URL?.trim() || 'https://api.duffel.com').replace(/\/$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.accessToken);
  }

  private mapCabin(cabin: FlightSearchParams['cabinClass']): string {
    switch (cabin) {
      case 'Premium Economy':
        return 'premium_economy';
      case 'Business':
        return 'business';
      case 'First Class':
        return 'first';
      default:
        return 'economy';
    }
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOfferResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const slices: Array<{ origin: string; destination: string; departure_date: string }> = [
      {
        origin: params.originCode.toUpperCase(),
        destination: params.destinationCode.toUpperCase(),
        departure_date: params.departureDate,
      },
    ];

    if (params.tripType === 'round-trip' && params.returnDate) {
      slices.push({
        origin: params.destinationCode.toUpperCase(),
        destination: params.originCode.toUpperCase(),
        departure_date: params.returnDate,
      });
    }

    const passengers: Array<{ type: 'adult' | 'child' | 'infant_without_seat' }> = [];
    for (let i = 0; i < params.adults; i++) passengers.push({ type: 'adult' });
    for (let i = 0; i < params.children; i++) passengers.push({ type: 'child' });
    for (let i = 0; i < params.infants; i++) passengers.push({ type: 'infant_without_seat' });

    const response = await fetch(`${this.baseUrl}/air/offer_requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers,
          cabin_class: this.mapCabin(params.cabinClass),
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Duffel search error (${response.status}): ${errText}`);
    }

    const payload = (await response.json()) as { data?: { offers?: Array<any> } };
    const offers = payload.data?.offers || [];

    return offers.slice(0, 15).map((offer: any): FlightOfferResult => {
      const firstSlice = offer.slices?.[0] || {};
      const segments = firstSlice.segments || [];
      const firstSeg = segments[0] || {};
      const lastSeg = segments[segments.length - 1] || firstSeg;
      const total = Number(offer.total_amount || 0);
      const base = Number(offer.base_amount || total * 0.8);
      const taxes = Number(offer.tax_amount || Math.max(0, total - base));

      return {
        id: `duffel_${offer.id}`,
        provider: 'duffel',
        isDemo: false,
        pricingType: 'confirmed_supplier',
        airline: offer.owner?.name || firstSeg.marketing_carrier?.name || 'Airline',
        airlineCode: offer.owner?.iata_code || firstSeg.marketing_carrier?.iata_code || 'XX',
        flightNumber: `${firstSeg.marketing_carrier?.iata_code || 'XX'}-${firstSeg.marketing_carrier_flight_number || '000'}`,
        origin: firstSeg.origin?.city_name || firstSeg.origin?.iata_code || params.originCode,
        originCode: firstSeg.origin?.iata_code || params.originCode,
        destination: lastSeg.destination?.city_name || lastSeg.destination?.iata_code || params.destinationCode,
        destinationCode: lastSeg.destination?.iata_code || params.destinationCode,
        departureDate: params.departureDate,
        departureTime: firstSeg.departing_at || '',
        arrivalTime: lastSeg.arriving_at || '',
        durationMinutes: 240,
        stops: Math.max(0, segments.length - 1),
        baggageAllowance: 'Checked baggage per fare conditions',
        cabinClass: params.cabinClass,
        refundable: Boolean(offer.conditions?.refund_before_departure?.allowed),
        refundRules: offer.conditions?.refund_before_departure?.allowed
          ? 'Refundable before departure with supplier penalty.'
          : 'Non-refundable fare per airline tariff.',
        fareBreakdown: {
          baseFare: Math.round(base),
          taxes: Math.round(taxes),
          serviceCharges: 0,
          totalAmount: Math.round(total),
          currency: offer.total_currency || params.currency || 'PKR',
        },
        totalPrice: Math.round(total),
        currency: offer.total_currency || params.currency || 'PKR',
        segments: segments.map((s: any) => ({
          airline: s.marketing_carrier?.name || 'Airline',
          airlineCode: s.marketing_carrier?.iata_code || 'XX',
          flightNumber: `${s.marketing_carrier?.iata_code || 'XX'}-${s.marketing_carrier_flight_number || '000'}`,
          origin: s.origin?.city_name || s.origin?.iata_code,
          originCode: s.origin?.iata_code,
          destination: s.destination?.city_name || s.destination?.iata_code,
          destinationCode: s.destination?.iata_code,
          departureTime: s.departing_at,
          arrivalTime: s.arriving_at,
          durationMinutes: 120,
        })),
        disclaimer: 'Live offer retrieved from Duffel Air API. Subject to final offer check before ticketing.',
      };
    });
  }

  async revalidateFare(offer: FlightOfferResult): Promise<FareRevalidationResult> {
    if (!this.isConfigured()) {
      throw new Error('Duffel API token is not configured.');
    }
    const rawId = offer.id.replace(/^duffel_/, '');
    const response = await fetch(`${this.baseUrl}/air/offers/${encodeURIComponent(rawId)}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Duffel-Version': 'v2',
      },
    });
    if (!response.ok) {
      return {
        offerId: offer.id,
        provider: this.name,
        available: false,
        isDemo: false,
        estimatedPrice: offer.totalPrice,
        confirmedPrice: offer.totalPrice,
        priceChanged: false,
        currency: offer.currency,
        fareBreakdown: offer.fareBreakdown,
        revalidatedAt: new Date().toISOString(),
        message: 'Offer expired or no longer available from supplier.',
      };
    }
    const data = (await response.json()) as { data?: any };
    const confirmed = Math.round(Number(data.data?.total_amount || offer.totalPrice));
    return {
      offerId: offer.id,
      provider: this.name,
      available: true,
      isDemo: false,
      estimatedPrice: offer.totalPrice,
      confirmedPrice: confirmed,
      priceChanged: confirmed !== offer.totalPrice,
      currency: data.data?.total_currency || offer.currency,
      fareBreakdown: {
        ...offer.fareBreakdown,
        totalAmount: confirmed,
      },
      revalidatedAt: new Date().toISOString(),
      message:
        confirmed !== offer.totalPrice
          ? 'Supplier fare updated during revalidation.'
          : 'Supplier fare confirmed with no price change.',
    };
  }
}
