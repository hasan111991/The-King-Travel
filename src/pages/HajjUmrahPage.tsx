import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, CheckCircle2, Sparkles } from 'lucide-react';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ASSETS, convertMoney, formatMoney } from '../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';

export function HajjUmrahPage() {
  const [searchParams] = useSearchParams();
  const { travelPackages, currency, settings } = useAgency();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const hajjUmrahPackages = travelPackages.filter(
    (p) => p.status === 'active' && p.category === 'hajj_umrah'
  );

  const [selectedProgram, setSelectedProgram] = useState(
    searchParams.get('program') || 'Umrah Season — Makkah & Madinah Guided Package'
  );
  const [departureCity, setDepartureCity] = useState(searchParams.get('from') || 'Dallas (DFW)');
  const [travelWindow, setTravelWindow] = useState(searchParams.get('season') || 'Flexible Dates');
  const [travelers, setTravelers] = useState('2 Travelers');
  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }
    setSubmitting(true);
    const inquiryId = generateId('inq');
    try {
      await setDoc(doc(db, 'inquiries', inquiryId), {
        inquiryId,
        userId: user?.uid || null,
        bookingId: null,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: `Hajj & Umrah Inquiry: ${selectedProgram}`,
        message: `Departure City: ${departureCity} | Travel Window: ${travelWindow} | Group Size: ${travelers} | Notes: ${notes || 'Requesting Umrah/Hajj itinerary and pricing.'}`,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
      showToast('Inquiry Received', 'Our Hajj & Umrah specialist desk will contact you shortly.', 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `inquiries/${inquiryId}`);
      } catch {
        showToast('Error', 'Unable to submit inquiry right now.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Banner */}
      <section className="relative bg-[#0F2942] text-white overflow-hidden">
        <img
          src={ASSETS.destSaudi}
          alt="Makkah & Madinah Saudi Arabia pilgrimage travel"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
            Umrah Season · Spiritual Travel Assistance
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white max-w-3xl">
            Hajj Services & Guided Umrah Packages
          </h1>
          <p className="text-sm sm:text-base text-[#E6ECF2] mt-4 max-w-2xl leading-relaxed">
            Experience spiritual journeys with guided Umrah packages to Makkah and Madinah, Haram-proximity hotel coordination, and attentive Hajj travel advisory from our Dallas team.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#pilgrimage-inquiry"
              className="px-5 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs sm:text-sm font-bold"
            >
              Request Umrah / Hajj Consultation
            </a>
            <Link
              to="/flights?from=DFW&to=JED"
              className="px-5 py-2.5 rounded-lg border border-white/30 hover:bg-white/10 text-white text-xs sm:text-sm font-semibold"
            >
              Search Jeddah (JED) Flights
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        {/* Packages */}
        <section>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2942] mb-6">
            Available Umrah & Hajj Programs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hajjUmrahPackages.map((pkg) => (
              <div
                key={pkg.packageId}
                className="bg-white border border-[#D9E2EC] rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#627D98] mb-2">
                    <span className="font-semibold text-[#FD8F1C]">Makkah & Madinah</span>
                    <span className="font-mono">{pkg.duration}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#0F2942]">{pkg.title}</h3>
                  <p className="text-sm text-[#486581] mt-2 leading-relaxed">{pkg.description}</p>
                  {pkg.includedServices && pkg.includedServices.length > 0 && (
                    <ul className="mt-4 space-y-1.5">
                      {pkg.includedServices.map((svc) => (
                        <li key={svc} className="text-xs text-[#243B53] flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#FD8F1C] shrink-0" /> {svc}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#E6ECF2] flex items-center justify-between gap-3">
                  <span className="font-mono text-base font-bold text-[#0F2942] tabular-nums">
                    {pkg.price
                      ? `From ${formatMoney(convertMoney(pkg.price, pkg.currency || 'USD', currency), currency)}`
                      : 'Custom Group Quotation'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProgram(pkg.title);
                      document.getElementById('pilgrimage-inquiry')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
                  >
                    Inquire for Dates
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Inquiry Form */}
        <section
          id="pilgrimage-inquiry"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8"
        >
          <div className="lg:col-span-5 space-y-4">
            <Sparkles className="w-8 h-8 text-[#FD8F1C]" />
            <h2 className="font-display text-2xl font-bold text-[#0F2942]">
              Umrah & Hajj Planning Desk
            </h2>
            <p className="text-sm text-[#486581] leading-relaxed">
              Share your departure city, preferred travel season, and group size. Our advisors coordinate flights to Jeddah (JED) or Madinah (MED), accommodations, and ground logistics.
            </p>
            <div className="pt-2 space-y-1 text-xs text-[#486581]">
              <p className="font-semibold text-[#0F2942]">Direct Phone: {settings.contactPhone}</p>
              {settings.secondaryPhone && <p>Secondary Desk: {settings.secondaryPhone}</p>}
              <p>Email: {settings.contactEmail}</p>
            </div>
          </div>

          <div className="lg:col-span-7">
            {submitted ? (
              <div className="bg-[#F9F9FA] border border-[#D9E2EC] rounded-xl p-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-[#0F2942]">Pilgrimage Inquiry Received</h3>
                <p className="text-sm text-[#486581]">
                  Thank you. Our Hajj & Umrah desk will reach out with package details and flight schedules.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Program *</label>
                    <input
                      type="text"
                      required
                      value={selectedProgram}
                      onChange={(e) => setSelectedProgram(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Departure City *</label>
                    <input
                      type="text"
                      required
                      value={departureCity}
                      onChange={(e) => setDepartureCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Preferred Window</label>
                    <input
                      type="text"
                      value={travelWindow}
                      onChange={(e) => setTravelWindow(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Number of Travelers</label>
                    <input
                      type="text"
                      value={travelers}
                      onChange={(e) => setTravelers(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Additional Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Hotel distance preference, wheelchair assistance, visa questions..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Umrah / Hajj Inquiry'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
