export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First Class';
export type TripType = 'one-way' | 'round-trip' | 'multi-city';

export interface FlightSegment {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  aircraft?: string;
}

export interface FlightSearchLeg {
  originCode: string;
  destinationCode: string;
  departureDate: string;
}

export interface FlightSearchParams {
  tripType: TripType;
  originCode: string;
  destinationCode: string;
  departureDate: string;
  returnDate?: string;
  legs?: FlightSearchLeg[];
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  currency: string;
  mode: 'demo' | 'live';
}

export interface FareBreakdown {
  baseFare: number;
  taxes: number;
  serviceCharges: number;
  totalAmount: number;
  currency: string;
}

export interface FlightOfferResult {
  id: string;
  provider: 'amadeus' | 'duffel' | 'demo' | 'manual_offer';
  isDemo: boolean;
  pricingType: 'demo_sample' | 'manual_quotation' | 'confirmed_supplier';
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  stopDetails?: string;
  baggageAllowance: string;
  cabinClass: CabinClass;
  refundable: boolean;
  refundRules: string;
  fareBreakdown: FareBreakdown;
  totalPrice: number;
  currency: string;
  segments: FlightSegment[];
  returnSegments?: FlightSegment[];
  disclaimer: string;
}

export interface FareRevalidationResult {
  offerId: string;
  provider: string;
  available: boolean;
  isDemo: boolean;
  estimatedPrice: number;
  confirmedPrice: number;
  priceChanged: boolean;
  currency: string;
  fareBreakdown: FareBreakdown;
  revalidatedAt: string;
  message: string;
}

export interface SupplierStatus {
  provider: 'amadeus' | 'duffel';
  name: string;
  configured: boolean;
  environment: string;
}

export interface FlightSupplierProvider {
  readonly id: 'amadeus' | 'duffel' | 'demo';
  readonly name: string;
  isConfigured(): boolean;
  searchFlights(params: FlightSearchParams): Promise<FlightOfferResult[]>;
  revalidateFare(offer: FlightOfferResult): Promise<FareRevalidationResult>;
}
