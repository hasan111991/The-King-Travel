import React from 'react';
import { Link } from 'react-router-dom';
import { Award, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useAgency } from '../context/AgencyContext';

export function AboutPage() {
  const { settings } = useAgency();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <section>
        <p className="text-xs font-semibold text-[#FD8F1C] mb-2">About Us</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
          {settings.agencyName} — {settings.tagline}
        </h1>
        <p className="text-base text-[#486581] mt-4 leading-relaxed">
          At The King Travel, we believe that travel is not just about reaching a destination – it’s about creating unforgettable memories, experiencing new cultures, and exploring the world with comfort and confidence.
        </p>
        <p className="text-sm text-[#486581] mt-3 leading-relaxed">
          Headquartered in {settings.officeAddress}, we serve individuals, families, corporate groups, and Umrah pilgrims with discounted airline tickets (including our 3 Check Bags Deal), negotiated hotel rates, honeymoon escapes, and guided international tours.
        </p>
      </section>

      {/* Executive Leadership */}
      <section className="bg-white border border-[#D9E2EC] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#FD8F1C] inline-flex items-center gap-1.5">
            <Award className="w-4 h-4" /> Executive Leadership
          </p>
          <h2 className="font-display text-2xl font-bold text-[#0F2942]">
            {settings.executiveName || 'M Kamal Siddiqui'}
          </h2>
          <p className="text-sm font-medium text-[#486581]">
            {settings.executiveRole || 'CEO of THE KING TRAVEL'}
          </p>
          <p className="text-sm text-[#486581] max-w-2xl leading-relaxed pt-1">
            Guiding The King Travel with personal accountability—ensuring every traveler receives attentive service, clear fare breakdowns, and dependable itinerary support from initial inquiry to safe return home.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-[#0F2942] inline-flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FD8F1C]" /> Transparent Booking Workflow
          </h2>
          <p className="text-sm text-[#486581] leading-relaxed">
            Customers see itemized base fares, taxes, and agency service charges before submitting a booking request. Platform booking confirmations are clearly distinguished from official airline-issued e-tickets, which are delivered only after payment verification and supplier ticketing.
          </p>
        </div>
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-[#0F2942]">Supplier & Full-Service Coordination</h2>
          <p className="text-sm text-[#486581] leading-relaxed">
            Our booking platform supports authorized flight supplier APIs (Amadeus Self-Service and Duffel) alongside direct agency desk quotations, Umrah Season coordination, luxury & budget hotel stays, and custom holiday tours.
          </p>
        </div>
      </section>

      <section className="bg-[#0F2942] text-white rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white">Dallas Office & Direct Support</h2>
          <p className="text-sm text-[#BCCCDC] inline-flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#FD8F1C]" /> {settings.officeAddress}
          </p>
          <p className="text-xs text-[#BCCCDC] flex flex-wrap items-center gap-3 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#FD8F1C]" />
              {settings.contactPhone}
              {settings.secondaryPhone ? ` / ${settings.secondaryPhone}` : ''}
            </span>
            <span>·</span>
            <span>{settings.contactEmail}</span>
          </p>
        </div>
        <Link
          to="/contact"
          className="px-5 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold whitespace-nowrap shrink-0"
        >
          Contact Our Desk
        </Link>
      </section>
    </div>
  );
}
