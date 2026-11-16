import type {
  AdminRoleRecord,
  AuditLogItem,
  BookingRecord,
  FlightRequestRecord,
  InquiryItem,
  PaymentRecord,
  UserProfile,
} from '../types/travel';

export const DEMO_ADMIN_EMAIL = 'admin@thekingtravel.com';
export const DEMO_ADMIN_PASSWORD = 'KingTravel@2026';
export const DEMO_ADMIN_UID = 'demo-admin-sandbox';
export const DEMO_ADMIN_NAME = 'Demo Operations Admin';

function makeTimestamp(daysOffset = 0) {
  const dt = new Date(Date.now() + daysOffset * 86400000);
  return {
    seconds: Math.floor(dt.getTime() / 1000),
    toDate: () => dt,
  };
}

export interface DemoAdminState {
  flightRequests: FlightRequestRecord[];
  bookings: BookingRecord[];
  payments: PaymentRecord[];
  customers: UserProfile[];
  inquiries: InquiryItem[];
  auditLogs: AuditLogItem[];
  admins: AdminRoleRecord[];
}

export function createInitialDemoAdminState(): DemoAdminState {
  const customers: UserProfile[] = [
    {
      uid: 'cust_demo_01',
      name: 'Ahmed Raza Siddiqui',
      email: 'ahmed.siddiqui@example.com',
      phone: '+1 (469) 555-0148',
      whatsapp: '+1 (469) 555-0148',
      nationality: 'United States',
      role: 'customer',
      status: 'active',
      createdAt: makeTimestamp(-18),
      updatedAt: makeTimestamp(-2),
    },
    {
      uid: 'cust_demo_02',
      name: 'Fatima Zahra Khan',
      email: 'fatima.khan@example.com',
      phone: '+92 300 5550192',
      whatsapp: '+92 300 5550192',
      nationality: 'Pakistan',
      role: 'customer',
      status: 'active',
      createdAt: makeTimestamp(-11),
      updatedAt: makeTimestamp(-1),
    },
    {
      uid: 'cust_demo_03',
      name: 'Bilal Tariq Mehmood',
      email: 'bilal.mehmood@example.com',
      phone: '+1 (703) 555-0183',
      whatsapp: '+1 (703) 555-0183',
      nationality: 'United States',
      role: 'customer',
      status: 'active',
      createdAt: makeTimestamp(-5),
      updatedAt: makeTimestamp(0),
    },
  ];

  const flightRequests: FlightRequestRecord[] = [
    {
      requestId: 'req_demo_8412',
      requestReference: 'REQ-2026-8412',
      userId: 'cust_demo_01',
      tripType: 'round-trip',
      departureCity: 'Dallas (DFW)',
      destinationCity: 'Dubai (DXB)',
      departureDate: '2026-12-12',
      returnDate: '2026-12-27',
      preferredAirline: 'Emirates (EK)',
      passengersCount: { adults: 2, children: 1, infants: 0 },
      cabinClass: 'Economy',
      passengerName: 'Ahmed Raza Siddiqui',
      email: 'ahmed.siddiqui@example.com',
      phoneWhatsapp: '+1 (469) 555-0148',
      additionalRequirements: '3 checked bags deal requested; aisle seats together.',
      status: 'New Request',
      quotations: [],
      paymentStatus: 'unpaid',
      createdAt: makeTimestamp(0),
      updatedAt: makeTimestamp(0),
    },
    {
      requestId: 'req_demo_8395',
      requestReference: 'REQ-2026-8395',
      userId: 'cust_demo_02',
      tripType: 'round-trip',
      departureCity: 'Karachi (KHI)',
      destinationCity: 'Jeddah (JED)',
      departureDate: '2026-12-05',
      returnDate: '2026-12-19',
      preferredAirline: 'Saudi Arabian Airlines (SV)',
      passengersCount: { adults: 2, children: 0, infants: 0 },
      cabinClass: 'Economy',
      passengerName: 'Fatima Zahra Khan',
      email: 'fatima.khan@example.com',
      phoneWhatsapp: '+92 300 5550192',
      additionalRequirements: 'Umrah family itinerary with wheelchair assistance at JED.',
      status: 'Awaiting Customer Approval',
      quotations: [
        {
          quotationId: 'qt_demo_sv1',
          airlineName: 'Saudi Arabian Airlines',
          flightNumber: 'SV-701',
          departureTime: '2026-12-05 03:20',
          arrivalTime: '2026-12-05 06:45',
          stops: 'Non-stop',
          baggageAllowance: '2 x 23 kg Checked + 7 kg Cabin',
          fare: 540,
          taxes: 115,
          serviceCharges: 35,
          totalPrice: 690,
          currency: 'USD',
          fareValidity: 'Valid for 24 hours subject to seat availability',
          refundCancellationRules: 'Refundable before departure minus $120 airline penalty.',
        },
        {
          quotationId: 'qt_demo_qr2',
          airlineName: 'Qatar Airways',
          flightNumber: 'QR-611',
          departureTime: '2026-12-05 09:40',
          arrivalTime: '2026-12-05 16:15',
          stops: '1 Stop in DOH (2h 10m)',
          baggageAllowance: '30 kg Checked + 7 kg Cabin',
          fare: 585,
          taxes: 120,
          serviceCharges: 35,
          totalPrice: 740,
          currency: 'USD',
          fareValidity: 'Valid for 24 hours',
          refundCancellationRules: 'Flexible date change permitted.',
        },
      ],
      paymentStatus: 'unpaid',
      createdAt: makeTimestamp(-1),
      updatedAt: makeTimestamp(0),
    },
    {
      requestId: 'req_demo_8360',
      requestReference: 'REQ-2026-8360',
      userId: 'cust_demo_03',
      tripType: 'one-way',
      departureCity: 'Washington Dulles (IAD)',
      destinationCity: 'Islamabad (ISB)',
      departureDate: '2026-12-01',
      preferredAirline: 'Qatar Airways (QR)',
      passengersCount: { adults: 1, children: 0, infants: 0 },
      cabinClass: 'Business',
      passengerName: 'Bilal Tariq Mehmood',
      email: 'bilal.mehmood@example.com',
      phoneWhatsapp: '+1 (703) 555-0183',
      status: 'Awaiting Payment',
      quotations: [
        {
          quotationId: 'qt_demo_qr_biz',
          airlineName: 'Qatar Airways',
          flightNumber: 'QR-708',
          departureTime: '2026-12-01 20:15',
          arrivalTime: '2026-12-02 23:45 (+1)',
          stops: '1 Stop in DOH',
          baggageAllowance: '2 x 32 kg Business + Lounge Access',
          fare: 2850,
          taxes: 340,
          serviceCharges: 60,
          totalPrice: 3250,
          currency: 'USD',
          fareValidity: 'Valid 48 hours',
          refundCancellationRules: 'Refundable with $200 fee.',
        },
      ],
      selectedQuotationId: 'qt_demo_qr_biz',
      selectedQuotation: {
        quotationId: 'qt_demo_qr_biz',
        airlineName: 'Qatar Airways',
        flightNumber: 'QR-708',
        departureTime: '2026-12-01 20:15',
        arrivalTime: '2026-12-02 23:45 (+1)',
        stops: '1 Stop in DOH',
        baggageAllowance: '2 x 32 kg Business + Lounge Access',
        fare: 2850,
        taxes: 340,
        serviceCharges: 60,
        totalPrice: 3250,
        currency: 'USD',
        fareValidity: 'Valid 48 hours',
        refundCancellationRules: 'Refundable with $200 fee.',
      },
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'pending_verification',
      transactionReference: 'ZELLE-KT-98412',
      createdAt: makeTimestamp(-3),
      updatedAt: makeTimestamp(0),
    },
  ];

  const bookings: BookingRecord[] = [
    {
      bookingId: 'bk_demo_7104',
      bookingReference: 'KT-2026-7104',
      userId: 'cust_demo_01',
      mode: 'live',
      flightDetails: {
        airline: 'Emirates',
        flightNumber: 'EK-222',
        origin: 'Dallas',
        originCode: 'DFW',
        destination: 'Dubai',
        destinationCode: 'DXB',
        departureDate: '2026-12-10',
        cabinClass: 'Economy',
      },
      passengers: [
        {
          type: 'Adult',
          firstName: 'Ahmed',
          lastName: 'Siddiqui',
          dateOfBirth: '1988-05-14',
          gender: 'Male',
          nationality: 'United States',
          passportNumber: 'US54892011',
          passportExpiry: '2031-04-01',
        },
      ],
      contactDetails: {
        email: 'ahmed.siddiqui@example.com',
        phone: '+1 (469) 555-0148',
        whatsapp: '+1 (469) 555-0148',
      },
      totalAmount: 1180,
      currency: 'USD',
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'confirmed',
      bookingStatus: 'Ticket Issued',
      supplierProvider: 'Amadeus GDS',
      supplierReference: 'X8K9PL',
      internalNotes: '3 Checked Bags Promo verified on PNR.',
      createdAt: makeTimestamp(-6),
      updatedAt: makeTimestamp(-2),
    },
    {
      bookingId: 'bk_demo_7119',
      bookingReference: 'KT-2026-7119',
      userId: 'cust_demo_02',
      mode: 'live',
      flightDetails: {
        airline: 'Turkish Airlines',
        flightNumber: 'TK-709',
        origin: 'Karachi',
        originCode: 'KHI',
        destination: 'Istanbul',
        destinationCode: 'IST',
        departureDate: '2026-12-18',
        cabinClass: 'Economy',
      },
      passengers: [
        {
          type: 'Adult',
          firstName: 'Fatima',
          lastName: 'Khan',
          dateOfBirth: '1992-09-22',
          gender: 'Female',
          nationality: 'Pakistan',
          passportNumber: 'PK8841209',
          passportExpiry: '2030-08-15',
        },
      ],
      contactDetails: {
        email: 'fatima.khan@example.com',
        phone: '+92 300 5550192',
        whatsapp: '+92 300 5550192',
      },
      totalAmount: 790,
      currency: 'USD',
      paymentMethod: 'JazzCash / Bank Transfer',
      paymentStatus: 'pending_verification',
      bookingStatus: 'Payment Verification',
      createdAt: makeTimestamp(0),
      updatedAt: makeTimestamp(0),
    },
  ];

  const payments: PaymentRecord[] = [
    {
      paymentId: 'pay_demo_01',
      bookingId: 'bk_demo_7104',
      userId: 'cust_demo_01',
      amount: 1180,
      currency: 'USD',
      paymentMethod: 'Bank Transfer',
      transactionReference: 'WIRE-DFW-7104',
      verificationStatus: 'verified',
      adminRemarks: 'Cleared into agency Chase business account.',
      createdAt: makeTimestamp(-5),
      updatedAt: makeTimestamp(-4),
    },
    {
      paymentId: 'pay_demo_02',
      bookingId: 'bk_demo_7119',
      userId: 'cust_demo_02',
      amount: 790,
      currency: 'USD',
      paymentMethod: 'JazzCash',
      transactionReference: 'JC-99284102',
      verificationStatus: 'pending',
      createdAt: makeTimestamp(0),
      updatedAt: makeTimestamp(0),
    },
  ];

  const inquiries: InquiryItem[] = [
    {
      inquiryId: 'inq_demo_01',
      userId: 'cust_demo_01',
      bookingId: 'bk_demo_7104',
      name: 'Ahmed Raza Siddiqui',
      email: 'ahmed.siddiqui@example.com',
      phone: '+1 (469) 555-0148',
      subject: 'Dubai Visa + Airport Transfer Add-on',
      message: 'Please advise if 30-day UAE tourist visas can be arranged alongside our DFW-DXB tickets.',
      status: 'new',
      createdAt: makeTimestamp(-1),
      updatedAt: makeTimestamp(-1),
    },
  ];

  const auditLogs: AuditLogItem[] = [
    {
      logId: 'log_demo_01',
      actorUid: DEMO_ADMIN_UID,
      actorEmail: DEMO_ADMIN_EMAIL,
      action: 'Initialized Demo Admin Sandbox',
      targetCollection: 'system',
      targetId: 'sandbox',
      details: 'Loaded sample bookings, flight requests, and payments for evaluation.',
      createdAt: makeTimestamp(0),
    },
  ];

  const admins: AdminRoleRecord[] = [
    {
      uid: 'bootstrapped-super-admin',
      email: 'hasanaamir815@gmail.com',
      name: 'Primary Agency Super Admin',
      role: 'super_admin',
      assignedBy: 'system',
      createdAt: makeTimestamp(-30),
    },
    {
      uid: DEMO_ADMIN_UID,
      email: DEMO_ADMIN_EMAIL,
      name: DEMO_ADMIN_NAME,
      role: 'admin',
      assignedBy: 'demo-sandbox',
      createdAt: makeTimestamp(0),
    },
  ];

  return {
    flightRequests,
    bookings,
    payments,
    customers,
    inquiries,
    auditLogs,
    admins,
  };
}
