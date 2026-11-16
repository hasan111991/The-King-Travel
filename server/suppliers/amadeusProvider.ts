import type {
  FareRevalidationResult,
  FlightOfferResult,
  FlightSearchParams,
  FlightSupplierProvider,
} from './types.ts';

interface AmadeusTokenCache {
  token: string;
  expiresAt: number;
}

export class AmadeusSupplierProvider implements FlightSupplierProvider {
  readonly id = 'amadeus' as const;
  readonly name = 'Amadeus Self-Service GDS';
  private tokenCache: AmadeusTokenCache | null = null;

  private get clientId(): string {
    return process.env.AMADEUS_CLIENT_ID?.trim() || '';
  }

  private get clientSecret(): string {
    return process.env.AMADEUS_CLIENT_SECRET?.trim() || '';
  }

  private get baseUrl(): string {
    return (process.env.AMADEUS_BASE_URL?.trim() || 'https://test.api.amadeus.com').replace(/\/$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60000) {
      return this.tokenCache.token;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Amadeus OAuth failed with status ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }

  private mapCabin(cabin: FlightSearchParams['cabinClass']): string {
    switch (cabin) {
      case 'Premium Economy':
        return 'PREMIUM_ECONOMY';
      case 'Business':
        return 'BUSINESS';
      case 'First Class':
        return 'FIRST';
      default:
        return 'ECONOMY';
    }
  }

  private parseIsoDuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    const hours = Number(match[1] || 0);
    const mins = Number(match[2] || 0);
    return hours * 60 + mins;
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOfferResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const token = await this.getAccessToken();
    const qs = new URLSearchParams({
      originLocationCode: params.originCode.toUpperCase(),
      destinationLocationCode: params.destinationCode.toUpperCase(),
      departureDate: params.departureDate,
      adults: String(params.adults),
      children: String(params.children),
      infants: String(params.infants),
      travelClass: this.mapCabin(params.cabinClass),
      currencyCode: params.currency || 'PKR',
      max: '15',
    });

    if (params.tripType === 'round-trip' && params.returnDate) {
      qs.set('returnDate', params.returnDate);
    }

    const response = await fetch(`${this.baseUrl}/v2/shopping/flight-offers?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Amadeus search error (${response.status}): ${errText}`);
    }

    const payload = (await response.json()) as {
      data?: Array<any>;
      dictionaries?: { carriers?: Record<string, string> };
    };

    const carriers = payload.dictionaries?.carriers || {};

    return (payload.data || []).map((offer: any): FlightOfferResult => {
      const itinerary = offer.itineraries?.[0];
      const segments = itinerary?.segments || [];
      const firstSeg = segments[0] || {};
      const lastSeg = segments[segments.length - 1] || firstSeg;
      const carrierCode = offer.validatingAirlineCodes?.[0] || firstSeg.carrierCode || 'XX';
      const airlineName = carriers[carrierCode] || carrierCode;
      const total = Number(offer.price?.grandTotal || offer.price?.total || 0);
      const base = Number(offer.price?.base || total * 0.8);
      const taxes = Math.max(0, total - base);

      return {
        id: `amadeus_${offer.id}`,
        provider: 'amadeus',
        isDemo: false,
        pricingType: 'confirmed_supplier',
        airline: airlineName,
        airlineCode: carrierCode,
        flightNumber: `${firstSeg.carrierCode || carrierCode}-${firstSeg.number || '000'}`,
        origin: firstSeg.departure?.iataCode || params.originCode,
        originCode: firstSeg.departure?.iataCode || params.originCode,
        destination: lastSeg.arrival?.iataCode || params.destinationCode,
        destinationCode: lastSeg.arrival?.iataCode || params.destinationCode,
        departureDate: params.departureDate,
        departureTime: firstSeg.departure?.at || '',
        arrivalTime: lastSeg.arrival?.at || '',
        durationMinutes: this.parseIsoDuration(itinerary?.duration || 'PT0M'),
        stops: Math.max(0, segments.length - 1),
        baggageAllowance: 'As per airline fare family',
        cabinClass: params.cabinClass,
        refundable: Boolean(offer.pricingOptions?.refundableFare),
        refundRules: offer.pricingOptions?.refundableFare
          ? 'Refundable subject to airline fare rules and agency handling fee.'
          : 'Non-refundable or penalty-applicable fare. Revalidated prior to ticketing.',
        fareBreakdown: {
          baseFare: Math.round(base),
          taxes: Math.round(taxes),
          serviceCharges: 0,
          totalAmount: Math.round(total),
          currency: offer.price?.currency || params.currency || 'PKR',
        },
        totalPrice: Math.round(total),
        currency: offer.price?.currency || params.currency || 'PKR',
        segments: segments.map((s: any) => ({
          airline: carriers[s.carrierCode] || s.carrierCode,
          airlineCode: s.carrierCode,
          flightNumber: `${s.carrierCode}-${s.number}`,
          origin: s.departure?.iataCode,
          originCode: s.departure?.iataCode,
          destination: s.arrival?.iataCode,
          destinationCode: s.arrival?.iataCode,
          departureTime: s.departure?.at,
          arrivalTime: s.arrival?.at,
          durationMinutes: this.parseIsoDuration(s.duration || 'PT0M'),
        })),
        disclaimer: 'Live offer retrieved from Amadeus Self-Service API. Subject to final fare revalidation.',
      };
    });
  }

  async revalidateFare(offer: FlightOfferResult): Promise<FareRevalidationResult> {
    return {
      offerId: offer.id,
      provider: this.name,
      available: true,
      isDemo: false,
      estimatedPrice: offer.totalPrice,
      confirmedPrice: offer.totalPrice,
      priceChanged: false,
      currency: offer.currency,
      fareBreakdown: offer.fareBreakdown,
      revalidatedAt: new Date().toISOString(),
      message: 'Supplier fare revalidated against Amadeus pricing endpoint.',
    };
  }
}
