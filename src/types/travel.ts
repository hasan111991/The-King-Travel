export type UserRole = 'customer' | 'booking_agent' | 'admin' | 'super_admin';
export type AccountStatus = 'active' | 'blocked';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  nationality?: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: any;
  updatedAt: any;
}

export interface SavedPassenger {
  passengerId: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  nationality: string;
  passportNumber?: string;
  passportExpiry?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AdminRoleRecord {
  uid: string;
  email: string;
  name: string;
  role: 'booking_agent' | 'admin' | 'super_admin';
  assignedBy: string;
  createdAt: any;
}

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
  provider: 'amadeus' | 'duffel' | 'manual_offer';
  isDemo: boolean;
  pricingType: 'manual_quotation' | 'confirmed_supplier';
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
  disclaimer: string;
}

export interface PassengerInput {
  type: 'Adult' | 'Child' | 'Infant';
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
}

export interface BookingContactDetails {
  email: string;
  phone: string;
  whatsapp: string;
}

export type PaymentStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'confirmed'
  | 'rejected'
  | 'refund_pending'
  | 'refunded';

export type BookingStatus =
  | 'New Request'
  | 'Pending Payment'
  | 'Payment Verification'
  | 'Payment Confirmed'
  | 'Supplier Confirmation Pending'
  | 'Ticket Issued'
  | 'Cancelled'
  | 'Refund Requested'
  | 'Refunded';

export interface BookingRecord {
  bookingId: string;
  bookingReference: string;
  userId: string;
  mode: 'live';
  flightDetails: Record<string, any>;
  passengers: PassengerInput[];
  contactDetails: BookingContactDetails;
  fareBreakdown?: FareBreakdown;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  supplierProvider?: string;
  supplierReference?: string;
  ticketFileUrl?: string;
  ticketFileName?: string;
  internalNotes?: string;
  refundReason?: string;
  createdAt: any;
  updatedAt: any;
}

export interface PaymentRecord {
  paymentId: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  receiptUrl?: string;
  receiptFileName?: string;
  transactionReference?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'refunded';
  adminRemarks?: string;
  createdAt: any;
  updatedAt: any;
}

export interface ManualFlightOffer {
  offerId: string;
  airline: string;
  airlineCode?: string;
  flightNumber?: string;
  origin: string;
  originCode?: string;
  destination: string;
  destinationCode?: string;
  departureDate: string;
  returnDate?: string;
  cabinClass?: CabinClass;
  price: number;
  currency: string;
  baggage: string;
  validity: string;
  notes?: string;
  status: 'active' | 'expired' | 'draft';
  createdAt: any;
  updatedAt: any;
}

export interface DestinationItem {
  destinationId: string;
  slug?: string;
  name: string;
  country: string;
  airportCode: string;
  city?: string;
  region?: 'international' | 'domestic' | 'usa_featured';
  description: string;
  imageUrl?: string;
  startingFare?: number;
  currency?: string;
  featured: boolean;
  order?: number;
  updatedAt?: any;
}

export interface TravelPackageItem {
  packageId: string;
  title: string;
  category: 'tour' | 'honeymoon' | 'hajj_umrah' | 'holiday';
  destination: string;
  destinationSlug?: string;
  duration: string;
  price?: number;
  currency?: string;
  description: string;
  includedServices?: string[];
  imageUrl?: string;
  featured?: boolean;
  status: 'active' | 'inactive';
  updatedAt?: any;
}

export interface SpecialOfferItem {
  offerId: string;
  title: string;
  subtitle?: string;
  description: string;
  destination: string;
  discountLabel: string;
  promoCode?: string;
  validUntil: string;
  status: 'active' | 'inactive';
  updatedAt?: any;
}

export interface TestimonialItem {
  testimonialId: string;
  customerName: string;
  city?: string;
  route: string;
  rating: number;
  quote: string;
  status: 'published' | 'hidden';
  updatedAt?: any;
}

export interface InquiryItem {
  inquiryId: string;
  userId?: string | null;
  bookingId?: string | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  adminReply?: string;
  createdAt: any;
  updatedAt: any;
}

export interface NotificationItem {
  notificationId: string;
  userId: string;
  bookingId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export interface HotelItem {
  hotelId: string;
  name: string;
  city: string;
  country: string;
  category: 'luxury_resort' | 'city_business' | 'haram_proximity' | 'budget';
  pricePerNight?: number;
  currency?: string;
  starRating: number;
  description: string;
  amenities: string[];
  imageUrl?: string;
  featured: boolean;
  status: 'active' | 'inactive';
  updatedAt?: any;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqRecord {
  faqId: string;
  question: string;
  answer: string;
  category?: string;
  order: number;
  status: 'published' | 'hidden';
  updatedAt?: any;
}

export interface AgencySettings {
  agencyName: string;
  tagline: string;
  logoUrl?: string;
  heroBannerUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  executiveName?: string;
  executiveRole?: string;
  operatingMode: 'live';
  defaultCurrency: string;
  whatsappNumber: string;
  contactEmail: string;
  contactPhone: string;
  secondaryPhone?: string;
  officeAddress: string;
  heroTitle: string;
  heroSubtitle: string;
  footerText?: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
    x?: string;
  };
  paymentMethods: {
    bankTransfer: boolean;
    jazzCash: boolean;
    easypaisa: boolean;
    cardGateway: boolean;
  };
  bankDetails: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    jazzCashNumber: string;
    easypaisaNumber: string;
    instructions: string;
  };
  faqs: FaqItem[];
  legalPages: {
    terms: string;
    privacy: string;
    refundPolicy: string;
    cancellationPolicy: string;
    bookingConditions: string;
  };
  updatedAt?: any;
}

export interface AuditLogItem {
  logId: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetCollection: string;
  targetId: string;
  details: string;
  createdAt: any;
}

export type FlightRequestStatus =
  | 'New Request'
  | 'Under Review'
  | 'Quotation Sent'
  | 'Awaiting Customer Approval'
  | 'Awaiting Payment'
  | 'Payment Verified'
  | 'Booking Confirmed'
  | 'Ticket Issued'
  | 'Cancelled';

export interface FlightRequestSegment {
  origin: string;
  destination: string;
  departureDate: string;
}

export interface FlightQuotationOption {
  quotationId: string;
  airlineName: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  stops: string;
  baggageAllowance: string;
  fare: number;
  taxes: number;
  serviceCharges: number;
  totalPrice: number;
  currency: string;
  fareValidity: string;
  refundCancellationRules: string;
  notes?: string;
  createdAt?: string;
}

export interface FlightRequestRecord {
  requestId: string;
  requestReference: string;
  userId: string | null;
  tripType: TripType;
  departureCity: string;
  destinationCity: string;
  departureDate: string;
  returnDate?: string;
  segments?: FlightRequestSegment[];
  preferredAirline: string;
  passengersCount: {
    adults: number;
    children: number;
    infants: number;
  };
  cabinClass: CabinClass;
  passengerName: string;
  email: string;
  phoneWhatsapp: string;
  additionalRequirements?: string;
  status: FlightRequestStatus;
  quotations: FlightQuotationOption[];
  selectedQuotationId?: string;
  selectedQuotation?: FlightQuotationOption | null;
  paymentMethod?: string;
  paymentStatus: 'unpaid' | 'pending_verification' | 'verified' | 'rejected';
  transactionReference?: string;
  paymentReceiptUrl?: string;
  paymentReceiptFileName?: string;
  supplierProvider?: string;
  supplierReference?: string;
  ticketFileUrl?: string;
  ticketFileName?: string;
  adminNotes?: string;
  createdAt: any;
  updatedAt: any;
}

