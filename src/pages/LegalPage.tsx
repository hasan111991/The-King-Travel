import React from 'react';
import { Link } from 'react-router-dom';
import { useAgency } from '../context/AgencyContext';

type LegalKey = 'terms' | 'privacy' | 'refundPolicy' | 'cancellationPolicy' | 'bookingConditions';

const LEGAL_META: Record<LegalKey, { title: string; subtitle: string }> = {
  terms: { title: 'Terms & Conditions', subtitle: 'Platform Usage & Agency Service Terms' },
  privacy: { title: 'Privacy Policy', subtitle: 'Customer Data & Document Protection' },
  refundPolicy: { title: 'Refund Policy', subtitle: 'Airline Fare Refunds & Agency Processing' },
  cancellationPolicy: { title: 'Cancellation Policy', subtitle: 'Pre-Ticketing & Post-Ticketing Cancellations' },
  bookingConditions: { title: 'Booking Conditions', subtitle: 'Passport, MRZ Spelling & Ticketing Rules' },
};

export function LegalPage({ docKey }: { docKey: LegalKey }) {
  const { settings } = useAgency();
  const meta = LEGAL_META[docKey];
  const body = settings.legalPages?.[docKey] || '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-10 space-y-6">
        <div className="border-b border-[#E6ECF2] pb-5">
          <p className="text-xs font-semibold text-[#168AAD]">{meta.subtitle}</p>
          <h1 className="font-display text-3xl font-bold text-[#102A43] mt-1">{meta.title}</h1>
        </div>
        <div className="prose prose-slate max-w-none text-sm text-[#243B53] leading-relaxed whitespace-pre-line">
          {body}
        </div>
        <div className="pt-6 border-t border-[#E6ECF2] flex flex-wrap gap-4 text-xs font-medium text-[#168AAD]">
          <Link to="/terms" className="hover:underline">Terms & Conditions</Link>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/refund-policy" className="hover:underline">Refund Policy</Link>
          <Link to="/cancellation-policy" className="hover:underline">Cancellation Policy</Link>
          <Link to="/booking-conditions" className="hover:underline">Booking Conditions</Link>
        </div>
      </div>
    </div>
  );
}
