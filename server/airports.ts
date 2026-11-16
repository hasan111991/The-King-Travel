export interface AirportEntry {
  code: string;
  city: string;
  name: string;
  country: string;
}

export const AIRPORTS_DATABASE: AirportEntry[] = [
  // United States Hubs (Dallas TX HQ & International Gateways)
  { code: 'DFW', city: 'Dallas', name: 'Dallas Fort Worth International Airport', country: 'United States' },
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International Airport', country: 'United States' },
  { code: 'IAD', city: 'Washington D.C.', name: 'Washington Dulles International Airport', country: 'United States' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare International Airport", country: 'United States' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International Airport', country: 'United States' },
  { code: 'IAH', city: 'Houston', name: 'George Bush Intercontinental Airport', country: 'United States' },

  // Top Destinations From USA (Migrated from thekingtravel.com)
  { code: 'GRU', city: 'Sao Paulo', name: 'Guarulhos International Airport', country: 'Brazil' },
  { code: 'ATH', city: 'Athens', name: 'Athens International Airport', country: 'Greece' },
  { code: 'FCO', city: 'Rome', name: 'Leonardo da Vinci–Fiumicino Airport', country: 'Italy' },
  { code: 'OTP', city: 'Bucharest', name: 'Henri Coanda International Airport', country: 'Romania' },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle Airport', country: 'France' },

  // Middle East & Hajj/Umrah Gateways
  { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'United Arab Emirates' },
  { code: 'AUH', city: 'Abu Dhabi', name: 'Zayed International Airport', country: 'United Arab Emirates' },
  { code: 'DOH', city: 'Doha', name: 'Hamad International Airport', country: 'Qatar' },
  { code: 'JED', city: 'Jeddah', name: 'King Abdulaziz International Airport', country: 'Saudi Arabia' },
  { code: 'MED', city: 'Madinah', name: 'Prince Mohammad bin Abdulaziz Airport', country: 'Saudi Arabia' },
  { code: 'RUH', city: 'Riyadh', name: 'King Khalid International Airport', country: 'Saudi Arabia' },

  // Europe & Resort Gateways
  { code: 'IST', city: 'Istanbul', name: 'Istanbul Airport', country: 'Turkey' },
  { code: 'LHR', city: 'London', name: 'London Heathrow Airport', country: 'United Kingdom' },
  { code: 'MAN', city: 'Manchester', name: 'Manchester Airport', country: 'United Kingdom' },
  { code: 'ZRH', city: 'Zurich', name: 'Zurich Airport', country: 'Switzerland' },
  { code: 'FRA', city: 'Frankfurt', name: 'Frankfurt Airport', country: 'Germany' },

  // Asia & Indian Ocean Packages
  { code: 'MLE', city: 'Male', name: 'Velana International Airport', country: 'Maldives' },
  { code: 'KUL', city: 'Kuala Lumpur', name: 'Kuala Lumpur International Airport', country: 'Malaysia' },
  { code: 'SIN', city: 'Singapore', name: 'Changi Airport', country: 'Singapore' },
  { code: 'DPS', city: 'Bali (Denpasar)', name: 'Ngurah Rai International Airport', country: 'Indonesia' },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport', country: 'Thailand' },

  // Pakistan Domestic & International Hubs
  { code: 'ISB', city: 'Islamabad', name: 'Islamabad International Airport', country: 'Pakistan' },
  { code: 'LHE', city: 'Lahore', name: 'Allama Iqbal International Airport', country: 'Pakistan' },
  { code: 'KHI', city: 'Karachi', name: 'Jinnah International Airport', country: 'Pakistan' },
  { code: 'KDU', city: 'Skardu', name: 'Skardu International Airport (Northern Pakistan)', country: 'Pakistan' },
  { code: 'GIL', city: 'Gilgit', name: 'Gilgit Airport (Hunza Gateway)', country: 'Pakistan' },
  { code: 'PEW', city: 'Peshawar', name: 'Bacha Khan International Airport', country: 'Pakistan' },
  { code: 'MUX', city: 'Multan', name: 'Multan International Airport', country: 'Pakistan' },
  { code: 'SKT', city: 'Sialkot', name: 'Sialkot International Airport', country: 'Pakistan' },
  { code: 'YYZ', city: 'Toronto', name: 'Toronto Pearson International Airport', country: 'Canada' },
];

export function searchAirports(query: string): AirportEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return AIRPORTS_DATABASE.slice(0, 14);
  return AIRPORTS_DATABASE.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
  ).slice(0, 14);
}
