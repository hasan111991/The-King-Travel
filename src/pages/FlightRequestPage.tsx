import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, PhoneCall, ShieldCheck } from 'lucide-react';
import { FlightBookingRequestForm } from '../components/FlightBookingRequestForm';
import { useAgency } from '../context/AgencyContext';
import type { CabinClass, FlightRequestSegment, TripType } from '../types/travel';

export function FlightRequestPage() {
  const [searchParams] = useSearchParams();
  const { settings } = useAgency();

  const initialTripType = (searchParams.get('tripType') as TripType) || 'round-trip';
  const initialOrigin = searchParams.get('from') || 'Dallas (DFW)';
  const initialDestination = searchParams.get('to') || 'Dubai (DXB)';
  const initialDepartureDate =
    searchParams.get('dep') || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const initialReturnDate =
    searchParams.get('ret') || new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  const initialAdults = Math.max(1, Number(searchParams.get('adults') || 1));
  const initialChildren = Math.max(0, Number(searchParams.get('children') || 0));
  const initialInfants = Math.max(0, Number(searchParams.get('infants') || 0));
  const initialCabin = (searchParams.get('cabin') as CabinClass) || 'Economy';

  const initialSegments = useMemo<FlightRequestSegment[] | undefined>(() => {
    const raw = searchParams.get('legs');
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed.map((leg: any) => ({
          origin: String(leg.originCode || leg.origin || ''),
          destination: String(leg.destinationCode || leg.destination || ''),
          departureDate: String(leg.departureDate || initialDepartureDate),
        }));
      }
    } catch {
      // ignore malformed URL param
    }
    return undefined;
  }, [searchParams, initialDepartureDate]);

  return (
    <div className="bg-[#F9F9FA] py-10 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D9E2EC] pb-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#FD8F1C] uppercase tracking-wider">
              Personalized Airline Ticketing Desk
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942] mt-1">
              Submit Your Flight Booking Request
            </h1>
            <p className="text-sm text-[#486581] mt-2 leading-relaxed">
              Tell us your travel route, dates, preferred airline, and special requirements. Our Dallas-based
              ticketing specialists check authorized global airline suppliers and deliver multiple clear fare
              quotations directly to your portal and email.
            </p>
          </div>
          <Link
            to="/my-bookings?tab=requests"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[#D9E2EC] bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#0F2942] whitespace-nowrap shrink-0"
          >
            Track Existing Requests
          </Link>
        </div>

        {/* Request Form */}
        <FlightBookingRequestForm
          initialTripType={initialTripType}
          initialOrigin={initialOrigin}
          initialDestination={initialDestination}
          initialDepartureDate={initialDepartureDate}
          initialReturnDate={initialReturnDate}
          initialAdults={initialAdults}
          initialChildren={initialChildren}
          initialInfants={initialInfants}
          initialCabin={initialCabin}
          initialSegments={initialSegments}
        />

        {/* How Manual Quotation & Ticketing Works */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-[#D9E2EC] rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0F2942] inline-flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FD8F1C]" aria-hidden="true" />
              How Our Flight Quotation &amp; Ticketing Workflow Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                {
                  step: '01 · Submit Request',
                  desc: 'Receive an instant unique Request ID saved to your account and alerted to our agency desk.',
                },
                {
                  step: '02 · Compare Airline Quotations',
                  desc: 'We check authorized suppliers and post itemized fare, taxes, baggage, and refund rule options.',
                },
                {
                  step: '03 · Approve & Verify Payment',
                  desc: 'Select your preferred airline quotation, submit payment proof, and await accounts verification.',
                },
                {
                  step: '04 · Genuine Airline E-Ticket',
                  desc: 'Once confirmed with the airline supplier, we upload your official airline e-ticket PDF for download.',
                },
              ].map((item) => (
                <div key={item.step} className="p-4 rounded-xl bg-[#F9F9FA] border border-[#E6ECF2]">
                  <p className="font-bold text-[#0F2942]">{item.step}</p>
                  <p className="text-[#486581] mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#0F2942] text-white rounded-2xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#FD8F1C]">Direct Agency Assistance</p>
              <h2 className="font-display text-xl font-bold">{settings.agencyName}</h2>
              <p className="text-xs text-[#BCCCDC] leading-relaxed">
                Need urgent same-day departures, group blocks, or 3 Check Bags promotional route checks?
              </p>
            </div>
            <div className="space-y-2.5 text-xs">
              <p className="flex items-center gap-2 text-[#E6ECF2]">
                <PhoneCall className="w-4 h-4 text-[#FD8F1C]" aria-hidden="true" />
                <span className="tabular-nums">{settings.contactPhone}</span>
              </p>
              <p className="flex items-center gap-2 text-[#E6ECF2]">
                <Mail className="w-4 h-4 text-[#FD8F1C]" aria-hidden="true" />
                <span>{settings.contactEmail}</span>
              </p>
              <p className="flex items-center gap-2 text-[#BCCCDC]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>{settings.officeAddress}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
