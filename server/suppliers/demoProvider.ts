import type {
  CabinClass,
  FareRevalidationResult,
  FlightOfferResult,
  FlightSearchParams,
  FlightSupplierProvider,
} from './types.ts';

const DEMO_CARRIERS = [
  { name: 'Emirates (Sample)', code: 'EK', baseMult: 1.18 },
  { name: 'Qatar Airways (Sample)', code: 'QR', baseMult: 1.14 },
  { name: 'Turkish Airlines (Sample)', code: 'TK', baseMult: 1.06 },
  { name: 'Saudia (Sample)', code: 'SV', baseMult: 0.98 },
  { name: 'American Airlines (Sample)', code: 'AA', baseMult: 1.09 },
  { name: 'Pakistan International Airlines (Sample)', code: 'PK', baseMult: 0.92 },
];

const CURRENCY_RATES_FROM_USD: Record<string, number> = {
  USD: 1,
  PKR: 278,
  AED: 3.67,
  SAR: 3.75,
  GBP: 0.79,
  EUR: 0.92,
};

const CABIN_MULTIPLIERS: Record<CabinClass, number> = {
  Economy: 1,
  'Premium Economy': 1.55,
  Business: 2.85,
  'First Class': 4.4,
};

const ROUTE_BASE_USD: Record<string, { base: number; duration: number; hub: string }> = {
  DXB: { base: 680, duration: 840, hub: 'DXB' },
  JED: { base: 790, duration: 860, hub: 'JED' },
  MED: { base: 810, duration: 875, hub: 'JED' },
  RUH: { base: 760, duration: 830, hub: 'RUH' },
  IST: { base: 690, duration: 690, hub: 'IST' },
  LHR: { base: 610, duration: 540, hub: 'LHR' },
  CDG: { base: 640, duration: 575, hub: 'CDG' },
  FCO: { base: 660, duration: 620, hub: 'FCO' },
  ATH: { base: 710, duration: 675, hub: 'ATH' },
  OTP: { base: 705, duration: 695, hub: 'IST' },
  GRU: { base: 650, duration: 590, hub: 'GRU' },
  ZRH: { base: 720, duration: 600, hub: 'ZRH' },
  MLE: { base: 1080, duration: 1090, hub: 'DOH' },
  KUL: { base: 890, duration: 1120, hub: 'DOH' },
  SIN: { base: 920, duration: 1100, hub: 'DOH' },
  DPS: { base: 980, duration: 1210, hub: 'DXB' },
  BKK: { base: 870, duration: 1080, hub: 'DOH' },
  ISB: { base: 820, duration: 960, hub: 'DOH' },
  LHE: { base: 815, duration: 950, hub: 'DXB' },
  KHI: { base: 810, duration: 940, hub: 'DXB' },
  KDU: { base: 920, duration: 1080, hub: 'ISB' },
  DFW: { base: 340, duration: 220, hub: 'DFW' },
  JFK: { base: 310, duration: 205, hub: 'JFK' },
};

export class DemoSupplierProvider implements FlightSupplierProvider {
  readonly id = 'demo' as const;
  readonly name = 'The King Travel Demo Sandbox';

  isConfigured(): boolean {
    return true;
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOfferResult[]> {
    const destInfo = ROUTE_BASE_USD[params.destinationCode.toUpperCase()] || {
      base: 720,
      duration: 600,
      hub: 'DXB',
    };
    const targetCurrency = params.currency || 'USD';
    const rate = CURRENCY_RATES_FROM_USD[targetCurrency] || 1;
    const cabinMult = CABIN_MULTIPLIERS[params.cabinClass] || 1;
    const passengerFactor = params.adults + params.children * 0.75 + params.infants * 0.15;
    const roundTripMult = params.tripType === 'round-trip' ? 1.84 : 1;

    const departures = ['07:15', '10:30', '14:45', '18:20', '21:55'];

    return DEMO_CARRIERS.map((carrier, idx) => {
      const depHourMin = departures[idx % departures.length];
      const stops = idx % 2 === 0 ? 0 : 1;
      const duration = destInfo.duration + (stops > 0 ? 115 : 0) + idx * 14;
      const estimatedUsd =
        destInfo.base * carrier.baseMult * cabinMult * passengerFactor * roundTripMult + idx * 24;
      const baseFare = Math.round(estimatedUsd * 0.78 * rate);
      const taxes = Math.round(estimatedUsd * 0.17 * rate);
      const serviceCharges = Math.round(estimatedUsd * 0.05 * rate);
      const totalAmount = baseFare + taxes + serviceCharges;

      const depDate = params.departureDate || new Date().toISOString().slice(0, 10);
      const depIso = `${depDate}T${depHourMin}:00`;
      const arrDateObj = new Date(new Date(depIso).getTime() + duration * 60000);
      const arrIso = Number.isNaN(arrDateObj.getTime())
        ? `${depDate}T23:55:00`
        : arrDateObj.toISOString().slice(0, 19);

      const flightNum = `${carrier.code}-${204 + idx * 37}`;
      const refundable = idx % 2 === 0;
      const layoverHub = destInfo.hub === params.destinationCode.toUpperCase() ? 'DXB' : destInfo.hub;

      return {
        id: `demo_${params.originCode}_${params.destinationCode}_${carrier.code}_${idx}_${depDate}`,
        provider: 'demo',
        isDemo: true,
        pricingType: 'demo_sample',
        airline: carrier.name,
        airlineCode: carrier.code,
        flightNumber: flightNum,
        origin: params.originCode.toUpperCase(),
        originCode: params.originCode.toUpperCase(),
        destination: params.destinationCode.toUpperCase(),
        destinationCode: params.destinationCode.toUpperCase(),
        departureDate: depDate,
        departureTime: depIso,
        arrivalTime: arrIso,
        durationMinutes: duration,
        stops,
        stopDetails: stops === 1 ? `1 layover (${layoverHub})` : 'Non-stop',
        baggageAllowance:
          idx === 0 || idx === 3
            ? '3 Checked Bags Deal Promo (Demo) + 7 kg Cabin'
            : params.cabinClass === 'Economy'
            ? '2 x 23 kg Checked + 7 kg Cabin (Demo)'
            : '3 x 32 kg Checked + 10 kg Cabin (Demo)',
        cabinClass: params.cabinClass,
        refundable,
        refundRules: refundable
          ? 'Demo fare rule: Refundable before departure subject to airline & agency cancellation charges.'
          : 'Demo fare rule: Restricted promotional fare; date change allowed with fare difference.',
        fareBreakdown: {
          baseFare,
          taxes,
          serviceCharges,
          totalAmount,
          currency: targetCurrency,
        },
        totalPrice: totalAmount,
        currency: targetCurrency,
        segments:
          stops === 0
            ? [
                {
                  airline: carrier.name,
                  airlineCode: carrier.code,
                  flightNumber: flightNum,
                  origin: params.originCode.toUpperCase(),
                  originCode: params.originCode.toUpperCase(),
                  destination: params.destinationCode.toUpperCase(),
                  destinationCode: params.destinationCode.toUpperCase(),
                  departureTime: depIso,
                  arrivalTime: arrIso,
                  durationMinutes: duration,
                },
              ]
            : [
                {
                  airline: carrier.name,
                  airlineCode: carrier.code,
                  flightNumber: flightNum,
                  origin: params.originCode.toUpperCase(),
                  originCode: params.originCode.toUpperCase(),
                  destination: layoverHub,
                  destinationCode: layoverHub,
                  departureTime: depIso,
                  arrivalTime: arrIso,
                  durationMinutes: Math.round(duration * 0.45),
                },
                {
                  airline: carrier.name,
                  airlineCode: carrier.code,
                  flightNumber: `${carrier.code}-${310 + idx * 19}`,
                  origin: layoverHub,
                  originCode: layoverHub,
                  destination: params.destinationCode.toUpperCase(),
                  destinationCode: params.destinationCode.toUpperCase(),
                  departureTime: depIso,
                  arrivalTime: arrIso,
                  durationMinutes: Math.round(duration * 0.45),
                },
              ],
        disclaimer:
          'DEMO MODE ESTIMATE: Sample flight schedule for workflow testing only. Not live airline inventory or a confirmed fare.',
      };
    });
  }

  async revalidateFare(offer: FlightOfferResult): Promise<FareRevalidationResult> {
    return {
      offerId: offer.id,
      provider: this.name,
      available: true,
      isDemo: true,
      estimatedPrice: offer.totalPrice,
      confirmedPrice: offer.totalPrice,
      priceChanged: false,
      currency: offer.currency,
      fareBreakdown: offer.fareBreakdown,
      revalidatedAt: new Date().toISOString(),
      message:
        'Demo mode revalidation complete. In Live Mode, confirmed supplier pricing is locked directly via Amadeus or Duffel prior to ticketing.',
    };
  }
}
