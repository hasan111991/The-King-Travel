import heroAirlineImg from '../assets/images/hero_airline_horizon_1794775337810.jpg';
import destDubaiImg from '../assets/images/dest_dubai_1794775338229.jpg';
import destIstanbulImg from '../assets/images/dest_istanbul_1794775338411.jpg';
import destLondonImg from '../assets/images/dest_london_1794775338693.jpg';
import destSaudiImg from '../assets/images/dest_makkah_saudi_1794775338928.jpg';
import destKualaLumpurImg from '../assets/images/dest_kuala_lumpur_1794775340187.jpg';
import type {
  AgencySettings,
  DestinationItem,
  ManualFlightOffer,
  SpecialOfferItem,
  TestimonialItem,
  TravelPackageItem,
} from '../types/travel';

export const ASSETS = {
  heroAirline: heroAirlineImg,
  destDubai: destDubaiImg,
  destLondon: destLondonImg,
  destIstanbul: destIstanbulImg,
  destSaudi: destSaudiImg,
  destKualaLumpur: destKualaLumpurImg,
};

export const DEFAULT_AGENCY_SETTINGS: AgencySettings = {
  agencyName: 'The King Travel',
  tagline: 'Your Ultimate Travel Partner!',
  executiveName: 'M Kamal Siddiqui',
  executiveRole: 'CEO of THE KING TRAVEL',
  operatingMode: 'demo',
  defaultCurrency: 'USD',
  whatsappNumber: '+1 571 620 9414',
  contactEmail: 'thekingtravel22@gmail.com',
  contactPhone: '+1 571 620 9414',
  secondaryPhone: '+1 972 815 7405',
  officeAddress: 'Dallas, Texas, USA',
  heroTitle: 'Discover the World with The King Travel',
  heroSubtitle:
    'Your journey deserves exceptional service. Discover destinations, explore flight deals and travel with confidence.',
  socialLinks: {
    facebook: 'https://www.facebook.com/profile.php?id=61578912663167',
    youtube: 'https://www.youtube.com/@thekingtravel-y7b',
    instagram: '',
    tiktok: '',
    linkedin: '',
    x: '',
  },
  paymentMethods: {
    bankTransfer: true,
    jazzCash: true,
    easypaisa: true,
    cardGateway: true,
  },
  bankDetails: {
    bankName: 'Bank Name (Editable in Admin Settings)',
    accountTitle: 'The King Travel LLC (Editable Placeholder)',
    accountNumber: 'Account / Routing Number (Editable in Admin Settings)',
    iban: 'IBAN / SWIFT (Editable Placeholder)',
    jazzCashNumber: 'JazzCash Account (Optional - Configure in Admin)',
    easypaisaNumber: 'Easypaisa Account (Optional - Configure in Admin)',
    instructions:
      'Transfer the exact booking amount to the agency account configured by our Dallas office and upload your payment receipt. Bookings remain pending until manual verification by our accounts desk.',
  },
  faqs: [
    {
      question: 'How does the Discounted Airline Tickets / 3 Check Bags Deal work?',
      answer:
        'Selected international corridors arranged through our ticketing desk qualify for promotional fares featuring up to 3 checked bags at no extra cost. Availability varies by carrier, season, and cabin class—request a quotation or search flights to confirm eligible routes.',
    },
    {
      question: 'When do I receive my confirmed airline e-ticket?',
      answer:
        'A booking confirmation generated at checkout is an agency reference and payment record. Your official airline-issued e-ticket PDF is uploaded to your customer portal and emailed after payment verification and supplier ticketing.',
    },
    {
      question: 'Do you arrange Hajj & Umrah packages and guided tours from the USA?',
      answer:
        'Yes. Based in Dallas, Texas, The King Travel coordinates Makkah & Madinah Umrah Season packages, Hajj assistance, curated honeymoon itineraries, and custom tour packages across Europe, Asia, the Middle East, and Northern Pakistan.',
    },
    {
      question: 'What is the difference between Demo Mode and Live Supplier Mode?',
      answer:
        'Demo Mode displays clearly labeled sample flights so you can test the full search, booking, and verification workflow. Live Mode connects authorized Amadeus and Duffel supplier APIs alongside direct manual agency desk quotations.',
    },
  ],
  legalPages: {
    terms:
      'At The King Travel, we believe that travel is not just about reaching a destination – it is about creating unforgettable memories, experiencing new cultures, and exploring the world with comfort and confidence. All flight bookings, hotel inquiries, and tour packages are subject to airline availability, fare revalidation prior to ticketing, and supplier terms.',
    privacy:
      'We collect passenger identification details, contact information, and payment verification records solely to process travel booking requests, package inquiries, and customer support. Customer records and uploaded receipts are restricted to the booking owner and authorized agency administrators.',
    refundPolicy:
      'Refund eligibility depends strictly on the fare rules of the selected airline ticket, hotel reservation, or tour supplier terms. Agency service fees may be non-refundable once ticketing is completed. Approved refunds are processed back to the original payment method following supplier settlement.',
    cancellationPolicy:
      'Cancellation requests submitted prior to ticket issuance are handled according to supplier hold rules. After an airline e-ticket has been issued, cancellations incur airline penalty fees plus applicable administrative handling charges.',
    bookingConditions:
      'Passenger names must match passport Machine Readable Zone (MRZ) spelling exactly. Passports for international travel should hold at least 6 months validity beyond the return date. A platform booking confirmation is not valid for airport boarding until an official airline e-ticket is issued.',
  },
};

export const DEFAULT_DESTINATIONS: DestinationItem[] = [
  // International Destinations & Tour Hubs
  {
    destinationId: 'dest_dubai',
    slug: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    airportCode: 'DXB',
    city: 'Dubai',
    region: 'international',
    description:
      'Explore modern luxury, desert adventures, iconic Burj Khalifa views, and Abu Dhabi cultural landmarks.',
    imageUrl: ASSETS.destDubai,
    startingFare: 680,
    currency: 'USD',
    featured: true,
    order: 1,
  },
  {
    destinationId: 'dest_saudi_arabia',
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    country: 'Kingdom of Saudi Arabia',
    airportCode: 'JED',
    city: 'Makkah & Madinah',
    region: 'international',
    description:
      'Experience spiritual journeys with guided Umrah packages to Makkah and Madinah and dedicated Hajj travel assistance.',
    imageUrl: ASSETS.destSaudi,
    startingFare: 790,
    currency: 'USD',
    featured: true,
    order: 2,
  },
  {
    destinationId: 'dest_istanbul',
    slug: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    airportCode: 'IST',
    city: 'Istanbul & Cappadocia',
    region: 'international',
    description:
      'Wander through vibrant bazaars, enjoy Bosphorus cruises, hot air balloon rides in Cappadocia, and ancient ruins.',
    imageUrl: ASSETS.destIstanbul,
    startingFare: 690,
    currency: 'USD',
    featured: true,
    order: 3,
  },
  {
    destinationId: 'dest_malaysia',
    slug: 'malaysia',
    name: 'Malaysia',
    country: 'Malaysia',
    airportCode: 'KUL',
    city: 'Kuala Lumpur & Langkawi',
    region: 'international',
    description:
      'Vibrant Kuala Lumpur, the Petronas Twin Towers, multicultural cuisine, and tropical beaches in Langkawi.',
    imageUrl: ASSETS.destKualaLumpur,
    startingFare: 890,
    currency: 'USD',
    featured: true,
    order: 4,
  },
  {
    destinationId: 'dest_london',
    slug: 'london',
    name: 'London',
    country: 'United Kingdom',
    airportCode: 'LHR',
    city: 'London',
    region: 'international',
    description:
      'Frequent transatlantic and connecting flights into Heathrow with curated hotel and group booking options.',
    imageUrl: ASSETS.destLondon,
    startingFare: 610,
    currency: 'USD',
    featured: true,
    order: 5,
  },
  {
    destinationId: 'dest_singapore',
    slug: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    airportCode: 'SIN',
    city: 'Singapore',
    region: 'international',
    description:
      'Modern marvels, Marina Bay Sands, Gardens by the Bay, world-class shopping on Orchard Road, and culinary excellence.',
    imageUrl: '',
    startingFare: 920,
    currency: 'USD',
    featured: true,
    order: 6,
  },
  {
    destinationId: 'dest_indonesia',
    slug: 'indonesia',
    name: 'Indonesia (Bali)',
    country: 'Indonesia',
    airportCode: 'DPS',
    city: 'Bali & Ubud',
    region: 'international',
    description:
      'Relax on Bali beaches, unwind in Ubud greenery, and discover ancient temples with island resorts.',
    imageUrl: '',
    startingFare: 980,
    currency: 'USD',
    featured: true,
    order: 7,
  },
  {
    destinationId: 'dest_maldives',
    slug: 'maldives',
    name: 'Maldives',
    country: 'Maldives',
    airportCode: 'MLE',
    city: 'Male Atolls',
    region: 'international',
    description:
      'Indulge in private overwater villas, turquoise waters, snorkeling excursions, and bespoke resort tranquility.',
    imageUrl: '',
    startingFare: 1080,
    currency: 'USD',
    featured: true,
    order: 8,
  },
  {
    destinationId: 'dest_switzerland',
    slug: 'switzerland',
    name: 'Switzerland',
    country: 'Switzerland',
    airportCode: 'ZRH',
    city: 'Zurich, Interlaken & Lucerne',
    region: 'international',
    description:
      'Ride scenic alpine trains, explore snowy Swiss Alps peaks, and relax in picturesque lakeside towns.',
    imageUrl: '',
    startingFare: 720,
    currency: 'USD',
    featured: true,
    order: 9,
  },

  // Top Destinations From USA (Migrated directly from thekingtravel.com)
  {
    destinationId: 'dest_brazil',
    slug: 'brazil',
    name: 'Brazil',
    country: 'Brazil',
    airportCode: 'GRU',
    city: 'Sao Paulo & Rio',
    region: 'usa_featured',
    description: 'Top South American getaway from USA hubs with competitive multi-carrier fares.',
    imageUrl: '',
    startingFare: 650,
    currency: 'USD',
    featured: true,
    order: 10,
  },
  {
    destinationId: 'dest_greece',
    slug: 'greece',
    name: 'Greece',
    country: 'Greece',
    airportCode: 'ATH',
    city: 'Athens & Islands',
    region: 'usa_featured',
    description: 'Mediterranean heritage, Aegean island escapes, and summer resort stays from the USA.',
    imageUrl: '',
    startingFare: 710,
    currency: 'USD',
    featured: true,
    order: 11,
  },
  {
    destinationId: 'dest_italy',
    slug: 'italy',
    name: 'Italy',
    country: 'Italy',
    airportCode: 'FCO',
    city: 'Rome, Florence & Venice',
    region: 'usa_featured',
    description: 'Timeless architecture, regional cuisine, and custom European itineraries departing the USA.',
    imageUrl: '',
    startingFare: 660,
    currency: 'USD',
    featured: true,
    order: 12,
  },
  {
    destinationId: 'dest_romania',
    slug: 'romania',
    name: 'Romania',
    country: 'Romania',
    airportCode: 'OTP',
    city: 'Bucharest & Transylvania',
    region: 'usa_featured',
    description: 'Historic Eastern European castles, scenic Carpathian trails, and cultural tours.',
    imageUrl: '',
    startingFare: 705,
    currency: 'USD',
    featured: true,
    order: 13,
  },
  {
    destinationId: 'dest_france',
    slug: 'france',
    name: 'France',
    country: 'France',
    airportCode: 'CDG',
    city: 'Paris & Riviera',
    region: 'usa_featured',
    description: 'Iconic Parisian landmarks, boutique hotels, and curated transatlantic flight packages.',
    imageUrl: '',
    startingFare: 640,
    currency: 'USD',
    featured: true,
    order: 14,
  },

  // Domestic & Northern Pakistan Highlight (Migrated from thekingtravel.com/packages)
  {
    destinationId: 'dest_northern_pakistan',
    slug: 'northern-pakistan',
    name: 'Northern Pakistan',
    country: 'Pakistan',
    airportCode: 'KDU',
    city: 'Hunza, Skardu & Fairy Meadows',
    region: 'domestic',
    description:
      'Discover serene valleys, breathtaking lakes, Hunza, Skardu, and Fairy Meadows with guided mountain tours.',
    imageUrl: '',
    startingFare: 920,
    currency: 'USD',
    featured: false,
    order: 15,
  },
  {
    destinationId: 'dest_islamabad',
    slug: 'islamabad',
    name: 'Islamabad',
    country: 'Pakistan',
    airportCode: 'ISB',
    city: 'Islamabad',
    region: 'domestic',
    description:
      'Direct connecting air corridors into Pakistan’s capital and gateway to northern mountain valleys.',
    imageUrl: '',
    startingFare: 820,
    currency: 'USD',
    featured: false,
    order: 16,
  },
  {
    destinationId: 'dest_lahore',
    slug: 'lahore',
    name: 'Lahore',
    country: 'Pakistan',
    airportCode: 'LHE',
    city: 'Lahore',
    region: 'domestic',
    description:
      'Cultural capital connections with 3 checked baggage seasonal promotions for family travel.',
    imageUrl: '',
    startingFare: 815,
    currency: 'USD',
    featured: false,
    order: 17,
  },
  {
    destinationId: 'dest_karachi',
    slug: 'karachi',
    name: 'Karachi',
    country: 'Pakistan',
    airportCode: 'KHI',
    city: 'Karachi',
    region: 'domestic',
    description:
      'Frequent international and domestic flight arrivals serving southern Pakistan and commercial travelers.',
    imageUrl: '',
    startingFare: 810,
    currency: 'USD',
    featured: false,
    order: 18,
  },
];

export const DEFAULT_TRAVEL_PACKAGES: TravelPackageItem[] = [
  // Tour & Holiday Packages
  {
    packageId: 'pkg_malaysia',
    title: 'Malaysia Discovery Tour',
    category: 'tour',
    destination: 'Malaysia',
    destinationSlug: 'malaysia',
    duration: '6 Days / 5 Nights',
    price: 1290,
    currency: 'USD',
    description: 'Vibrant Kuala Lumpur city highlights and tropical beaches in Langkawi.',
    includedServices: ['Hotel Accommodation', 'City Tours', 'Airport Transfers', 'Visa Guidance'],
    imageUrl: ASSETS.destKualaLumpur,
    featured: true,
    status: 'active',
  },
  {
    packageId: 'pkg_singapore',
    title: 'Singapore Urban & Garden Escape',
    category: 'holiday',
    destination: 'Singapore',
    destinationSlug: 'singapore',
    duration: '5 Days / 4 Nights',
    price: 1380,
    currency: 'USD',
    description: 'Modern marvels, Marina Bay, Orchard Road shopping, and culinary excellence.',
    includedServices: ['4-Star Hotel', 'Marina Bay Tour', 'Airport Transfers', 'Daily Breakfast'],
    featured: false,
    status: 'active',
  },
  {
    packageId: 'pkg_indonesia',
    title: 'Indonesia Bali & Ubud Retreat',
    category: 'holiday',
    destination: 'Indonesia',
    destinationSlug: 'indonesia',
    duration: '7 Days / 6 Nights',
    price: 1450,
    currency: 'USD',
    description: 'Relax on Bali beaches, unwind in Ubud greenery, and discover ancient temples.',
    includedServices: ['Resort Stay', 'Ubud Cultural Tour', 'Private Transfers', 'Daily Breakfast'],
    featured: false,
    status: 'active',
  },
  {
    packageId: 'pkg_saudi_umrah',
    title: 'Umrah Season — Makkah & Madinah Guided Package',
    category: 'hajj_umrah',
    destination: 'Saudi Arabia',
    destinationSlug: 'saudi-arabia',
    duration: '10 Days / 9 Nights',
    price: 1850,
    currency: 'USD',
    description:
      'Experience spiritual journeys with guided Umrah packages to Makkah and Madinah including Haram-proximity hotels and Ziyarat coordination.',
    includedServices: [
      'Round-Trip Flight Coordination',
      'Makkah & Madinah Hotel Stays',
      'Ground Transport & Ziyarat',
      'Umrah Visa Assistance',
    ],
    imageUrl: ASSETS.destSaudi,
    featured: true,
    status: 'active',
  },
  {
    packageId: 'pkg_hajj_assist',
    title: 'Hajj Travel & Advisory Package',
    category: 'hajj_umrah',
    destination: 'Saudi Arabia',
    destinationSlug: 'saudi-arabia',
    duration: '14–21 Days (Seasonal)',
    description:
      'Comprehensive Hajj travel planning, airline seat coordination, documentation checklists, and experienced group guidance.',
    includedServices: [
      'Dedicated Hajj Desk Support',
      'Flight Itinerary Planning',
      'Documentation Guidance',
      'Group Coordination',
    ],
    imageUrl: ASSETS.destSaudi,
    featured: false,
    status: 'active',
  },
  {
    packageId: 'pkg_dubai_tour',
    title: 'Dubai & Abu Dhabi Explorer',
    category: 'tour',
    destination: 'Dubai',
    destinationSlug: 'dubai',
    duration: '6 Days / 5 Nights',
    price: 1190,
    currency: 'USD',
    description: 'Explore modern luxury, desert adventures, and Abu Dhabi cultural landmarks.',
    includedServices: ['Luxury Hotel Stay', 'Desert Safari', 'City Tour', 'Airport Transfers'],
    imageUrl: ASSETS.destDubai,
    featured: true,
    status: 'active',
  },
  {
    packageId: 'pkg_istanbul_tour',
    title: 'Istanbul & Cappadocia Heritage Tour',
    category: 'tour',
    destination: 'Istanbul',
    destinationSlug: 'istanbul',
    duration: '8 Days / 7 Nights',
    price: 1590,
    currency: 'USD',
    description:
      'Wander through vibrant bazaars, enjoy hot air balloon rides in Cappadocia, and explore ancient ruins.',
    includedServices: ['Boutique Hotels', 'Bosphorus Cruise', 'Cappadocia Domestic Flight', 'Guided Tours'],
    imageUrl: ASSETS.destIstanbul,
    featured: true,
    status: 'active',
  },
  {
    packageId: 'pkg_northern_pakistan',
    title: 'Northern Pakistan — Hunza, Skardu & Fairy Meadows',
    category: 'tour',
    destination: 'Northern Pakistan',
    destinationSlug: 'northern-pakistan',
    duration: '9 Days / 8 Nights',
    price: 1120,
    currency: 'USD',
    description: 'Discover serene valleys and breathtaking lakes in Hunza, Skardu, and Fairy Meadows.',
    includedServices: ['Mountain Lodge Stays', 'Private 4x4 Transport', 'Experienced Local Guide', 'Meals'],
    featured: true,
    status: 'active',
  },

  // Honeymoon Packages (Migrated directly from /honeymoon-packages)
  {
    packageId: 'pkg_hm_dubai',
    title: 'Dubai Desert Glamour',
    category: 'honeymoon',
    destination: 'Dubai',
    destinationSlug: 'dubai',
    duration: '5–7 Days',
    price: 1490,
    currency: 'USD',
    description: 'Burj Khalifa views, luxury shopping, desert safari, and romantic marina dining.',
    includedServices: ['5-Star Couples Resort', 'Burj Khalifa Entry', 'Private Desert Safari', 'Airport Transfers'],
    imageUrl: ASSETS.destDubai,
    featured: true,
    status: 'active',
  },
  {
    packageId: 'pkg_hm_istanbul',
    title: 'Romance in Istanbul & Cappadocia',
    category: 'honeymoon',
    destination: 'Istanbul',
    destinationSlug: 'istanbul',
    duration: '7–10 Days',
    price: 1890,
    currency: 'USD',
    description: 'Hotels, guided city tours, sunset Bosphorus cruise, and Cappadocia hot air balloon experience.',
    includedServices: ['Boutique Hotel Stays', 'Bosphorus Sunset Cruise', 'Hot Air Balloon Option', 'City Tours'],
    imageUrl: ASSETS.destIstanbul,
    featured: true,
    status: 'active',
  },
  {
    packageId: 'pkg_hm_maldives',
    title: 'Maldives Luxury Overwater Experience',
    category: 'honeymoon',
    destination: 'Maldives',
    destinationSlug: 'maldives',
    duration: '7 Days',
    price: 2650,
    currency: 'USD',
    description: 'Overwater villa, private beach dinner, snorkeling excursions, and couples spa ritual.',
    includedServices: ['Overwater Villa', 'Private Beach Dinner', 'Snorkeling Excursion', 'Couples Spa'],
    featured: true,
    status: 'active',
  },
  {
    packageId: 'pkg_hm_switzerland',
    title: 'Switzerland Alpine Romance',
    category: 'honeymoon',
    destination: 'Switzerland',
    destinationSlug: 'switzerland',
    duration: '7–10 Days',
    price: 2450,
    currency: 'USD',
    description: 'Zurich, Interlaken, and Lucerne lakeside stays with panoramic Swiss scenic train rides.',
    includedServices: ['Zurich & Lucerne Hotels', 'Swiss Scenic Rail Pass', 'Interlaken Excursion', 'Daily Breakfast'],
    featured: true,
    status: 'active',
  },
];

export const DEFAULT_SPECIAL_OFFERS: SpecialOfferItem[] = [
  {
    offerId: 'offer_3_check_bags',
    title: 'Discounted Airline Tickets / 3 Check Bags Deal',
    subtitle: 'Extra Luggage Promotion on Top Airlines',
    description:
      'Get unbeatable rates with 3 checked bags at no extra cost! Take off on top airlines to your favorite international destinations at our rock-bottom prices.',
    destination: 'DXB',
    discountLabel: '3 Check Bags Deal',
    promoCode: '3BAGS-DEAL',
    validUntil: '2026-12-31',
    status: 'active',
  },
  {
    offerId: 'offer_exotic_hotels',
    title: 'Top Brand Hotels & Resorts at Exotic Locations',
    subtitle: 'Specially Negotiated Agency Rates',
    description:
      'Stay at Top Brand Hotels & Resorts at Exotic Locations with our specially negotiated rates—matching your flight dates seamlessly.',
    destination: 'MLE',
    discountLabel: 'Negotiated Hotel Rates',
    promoCode: 'HOTEL-VIP',
    validUntil: '2026-12-31',
    status: 'active',
  },
  {
    offerId: 'offer_umrah_season',
    title: 'Umrah Season — Guided Packages',
    subtitle: 'Makkah & Madinah Spiritual Journeys',
    description:
      'Reserve coordinated flights, Haram-proximity hotels, and guided Ziyarat schedules for individuals and families departing from the USA and worldwide.',
    destination: 'JED',
    discountLabel: 'Umrah Season',
    promoCode: 'UMRAH-SEASON',
    validUntil: '2026-12-31',
    status: 'active',
  },
];

export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    testimonialId: 'test_linda_paulo',
    customerName: 'Linda and Paulo',
    city: 'USA Travelers',
    route: 'From Italy',
    rating: 5,
    quote:
      "Words can't capture the beauty and warmth we encountered. Italy was simply enchanting.",
    status: 'published',
  },
  {
    testimonialId: 'test_jacques_marie',
    customerName: 'Jacques and Marie',
    city: 'USA Travelers',
    route: 'From France',
    rating: 5,
    quote:
      'The places we explored were breathtaking, the locals were welcoming, the cuisine was delightful, and there were countless exciting activities to enjoy.',
    status: 'published',
  },
  {
    testimonialId: 'test_rose_peter',
    customerName: 'Rose and Peter',
    city: 'USA Travelers',
    route: 'From United Kingdom',
    rating: 5,
    quote: 'Everything was perfectly arranged. We truly appreciate all your efforts!',
    status: 'published',
  },
];

export const DEFAULT_MANUAL_OFFERS: ManualFlightOffer[] = [
  {
    offerId: 'man_dfw_dxb_01',
    airline: 'Emirates (3 Check Bags Agency Deal)',
    airlineCode: 'EK',
    flightNumber: 'EK-222',
    origin: 'Dallas',
    originCode: 'DFW',
    destination: 'Dubai',
    destinationCode: 'DXB',
    departureDate: '2026-12-10',
    cabinClass: 'Economy',
    price: 785,
    currency: 'USD',
    baggage: '3 Checked Bags Deal + 7 kg Cabin',
    validity: '2026-12-05',
    notes: 'Discounted Airline Tickets / 3 Check Bags promotional quotation; seats confirmed upon request.',
    status: 'active',
    createdAt: null,
    updatedAt: null,
  },
  {
    offerId: 'man_jfk_jed_02',
    airline: 'Saudia (Umrah Season Quotation)',
    airlineCode: 'SV',
    flightNumber: 'SV-020',
    origin: 'New York',
    originCode: 'JFK',
    destination: 'Jeddah',
    destinationCode: 'JED',
    departureDate: '2026-12-15',
    cabinClass: 'Economy',
    price: 840,
    currency: 'USD',
    baggage: '2 x 23 kg Checked + 7 kg Hand',
    validity: '2026-12-10',
    notes: 'Ideal for Makkah & Madinah Umrah travelers. Subject to final supplier confirmation.',
    status: 'active',
    createdAt: null,
    updatedAt: null,
  },
];

export const TRAVEL_SERVICES = [
  {
    id: 'flight-bookings',
    number: '01',
    title: 'International & Domestic Flight Bookings',
    description:
      'Take off on top airlines to your favorite destinations at rock-bottom prices, including our signature 3 Check Bags promotional deals.',
  },
  {
    id: 'hotel-reservations',
    number: '02',
    title: 'Luxury & Budget Hotel Reservations',
    description:
      'Stay at top brand hotels and resorts at exotic locations with our specially negotiated agency rates.',
  },
  {
    id: 'hajj-umrah',
    number: '03',
    title: 'Hajj Services & Umrah Packages',
    description:
      'Dedicated spiritual travel coordination for Makkah & Madinah Umrah Season packages and Hajj travel assistance.',
  },
  {
    id: 'custom-tour-packages',
    number: '04',
    title: 'Custom Tour & Holiday Packages',
    description:
      'Tailored itineraries across Dubai, Istanbul, Malaysia, Singapore, Indonesia, Maldives, Switzerland, and Northern Pakistan.',
  },
  {
    id: 'honeymoon-packages',
    number: '05',
    title: 'Honeymoon Packages',
    description:
      'Curated romantic escapes including Dubai Desert Glamour, Istanbul Romance, Maldives Overwater Villas, and Swiss Alpine tours.',
  },
  {
    id: 'corporate-group',
    number: '06',
    title: 'Corporate & Group Travel Solutions',
    description:
      'Consolidated fares, multi-passenger manifest management, and priority support for organizations and family groups.',
  },
  {
    id: 'guided-tours',
    number: '07',
    title: 'Guided Tours with Local Guides',
    description:
      'Immersive excursions led by experienced local guides covering heritage landmarks, culinary routes, and scenic wonders.',
  },
  {
    id: 'visa-assistance',
    number: '08',
    title: 'Visa Assistance & Travel Insurance',
    description:
      'Structured visa checklist support, confirmed flight itinerary letters, and comprehensive travel protection coverage.',
  },
];

export const CURRENCY_RATES_FROM_USD: Record<string, number> = {
  USD: 1,
  PKR: 278,
  AED: 3.67,
  SAR: 3.75,
  GBP: 0.79,
  EUR: 0.92,
};

export function formatMoney(amount: number, currency = 'USD'): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  if (currency === 'USD') {
    return `$${safeAmount.toLocaleString('en-US')}`;
  }
  return `${currency} ${safeAmount.toLocaleString('en-US')}`;
}

export function convertMoney(amount: number, fromCurrency = 'USD', toCurrency = 'USD'): number {
  const fromRate = CURRENCY_RATES_FROM_USD[fromCurrency] || 1;
  const toRate = CURRENCY_RATES_FROM_USD[toCurrency] || 1;
  const usdValue = amount / fromRate;
  return Math.round(usdValue * toRate);
}

export function convertFromPkr(amountPkr: number, targetCurrency: string): number {
  return convertMoney(amountPkr, 'PKR', targetCurrency);
}
