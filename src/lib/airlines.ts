export interface AirlineOption {
  code: string;
  name: string;
  country: string;
}

export const AIRLINES: AirlineOption[] = [
  { code: 'ANY', name: 'Any Airline', country: 'Flexible / Best Available Option' },
  { code: 'EK', name: 'Emirates', country: 'United Arab Emirates' },
  { code: 'QR', name: 'Qatar Airways', country: 'Qatar' },
  { code: 'TK', name: 'Turkish Airlines', country: 'Turkey' },
  { code: 'SV', name: 'Saudia', country: 'Saudi Arabia' },
  { code: 'EY', name: 'Etihad Airways', country: 'United Arab Emirates' },
  { code: 'AA', name: 'American Airlines', country: 'United States' },
  { code: 'UA', name: 'United Airlines', country: 'United States' },
  { code: 'DL', name: 'Delta Air Lines', country: 'United States' },
  { code: 'BA', name: 'British Airways', country: 'United Kingdom' },
  { code: 'LH', name: 'Lufthansa', country: 'Germany' },
  { code: 'AF', name: 'Air France', country: 'France' },
  { code: 'KL', name: 'KLM Royal Dutch Airlines', country: 'Netherlands' },
  { code: 'LX', name: 'Swiss International Air Lines', country: 'Switzerland' },
  { code: 'SQ', name: 'Singapore Airlines', country: 'Singapore' },
  { code: 'MH', name: 'Malaysia Airlines', country: 'Malaysia' },
  { code: 'TG', name: 'Thai Airways', country: 'Thailand' },
  { code: 'PK', name: 'Pakistan International Airlines (PIA)', country: 'Pakistan' },
  { code: 'PA', name: 'Airblue', country: 'Pakistan' },
  { code: 'ER', name: 'SereneAir', country: 'Pakistan' },
  { code: 'GF', name: 'Gulf Air', country: 'Bahrain' },
  { code: 'WY', name: 'Oman Air', country: 'Oman' },
  { code: 'KU', name: 'Kuwait Airways', country: 'Kuwait' },
  { code: 'RJ', name: 'Royal Jordanian', country: 'Jordan' },
  { code: 'MS', name: 'EgyptAir', country: 'Egypt' },
  { code: 'AC', name: 'Air Canada', country: 'Canada' },
  { code: 'LA', name: 'LATAM Airlines', country: 'Chile / Brazil' },
  { code: 'A3', name: 'Aegean Airlines', country: 'Greece' },
  { code: 'AZ', name: 'ITA Airways', country: 'Italy' },
  { code: 'IB', name: 'Iberia', country: 'Spain' },
  { code: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' },
  { code: 'GA', name: 'Garuda Indonesia', country: 'Indonesia' },
];
