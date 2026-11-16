import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Building2, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ASSETS } from '../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';

const CURATED_HOTEL_CATEGORIES = [
  {
    id: 'luxury-resorts',
    title: 'Exotic Resorts & Overwater Villas',
    locations: 'Maldives · Bali (Ubud) · Seychelles',
    description:
      'Stay at Top Brand Hotels & Resorts at Exotic Locations with our specially negotiated agency rates, ideal for honeymoons and luxury escapes.',
    image: ASSETS.destKualaLumpur,
  },
  {
    id: 'dubai-istanbul-city',
    title: 'City-Center & Luxury Business Hotels',
    locations: 'Dubai · Istanbul · London · Singapore',
    description:
      'Handpicked 4-star and 5-star properties matched seamlessly to your flight arrival times and airport transfer preferences.',
    image: ASSETS.destDubai,
  },
  {
    id: 'haram-proximity',
    title: 'Makkah & Madinah Haram-Proximity Stays',
    locations: 'Makkah · Madinah',
    description:
      'Verified family-friendly and executive accommodations within walking distance of Masjid al-Haram and Al-Masjid an-Nabawi for Umrah travelers.',
    image: ASSETS.destSaudi,
  },
];

export function HotelsPage() {
  const [searchParams] = useSearchParams();
  const { settings } = useAgency();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [destination, setDestination] = useState(searchParams.get('destination') || 'Dubai');
  const [checkIn, setCheckIn] = useState(searchParams.get('checkin') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkout') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '2 Guests · 1 Room');
  const [hotelTier, setHotelTier] = useState('5-Star / Top Brand Resort');
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
        subject: `Hotel Rate Request: ${destination} (${hotelTier})`,
        message: `Check-in: ${checkIn || 'Flexible'} | Check-out: ${checkOut || 'Flexible'} | Guests: ${guests} | Notes: ${notes || 'Requesting negotiated hotel rates.'}`,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
      showToast('Hotel Request Sent', 'Our hotel desk will prepare a negotiated rate quote.', 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `inquiries/${inquiryId}`);
      } catch {
        showToast('Submission Error', 'Unable to submit request right now.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      <section className="max-w-3xl">
        <p className="text-xs font-semibold text-[#FD8F1C] mb-2">Hotel Reservations</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
          Stay at Top Brand Hotels & Resorts at Exotic Locations
        </h1>
        <p className="text-base text-[#486581] mt-3 leading-relaxed">
          Access specially negotiated agency rates on luxury and budget hotel accommodations worldwide. Submit your dates below and our Dallas travel desk will return verified room options matched to your itinerary.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CURATED_HOTEL_CATEGORIES.map((cat) => (
          <article
            key={cat.id}
            className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden flex flex-col"
          >
            <div className="aspect-[16/10] w-full bg-[#0F2942] overflow-hidden">
              <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#FD8F1C] inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {cat.locations}
                </p>
                <h2 className="text-lg font-bold text-[#0F2942] mt-1.5">{cat.title}</h2>
                <p className="text-sm text-[#486581] mt-2 leading-relaxed">{cat.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDestination(cat.locations.split('·')[0].trim());
                  document.getElementById('hotel-quote-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-5 w-full py-2.5 rounded-lg bg-[#0F2942] hover:bg-[#1C3D5A] text-white text-xs font-semibold"
              >
                Request Negotiated Rate
              </button>
            </div>
          </article>
        ))}
      </section>

      <section
        id="hotel-quote-form"
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8"
      >
        <div className="lg:col-span-5 space-y-4">
          <Building2 className="w-8 h-8 text-[#FD8F1C]" />
          <h2 className="font-display text-2xl font-bold text-[#0F2942]">
            Request Hotel Reservation Quote
          </h2>
          <p className="text-sm text-[#486581] leading-relaxed">
            Whether you need a corporate hotel in London, a beachfront resort in Maldives or Bali, or Haram-proximity rooms in Saudi Arabia, our desk secures transparent package or room-only pricing.
          </p>
          <div className="pt-2 space-y-2 text-xs text-[#486581]">
            <p className="inline-flex items-center gap-2 text-[#0F2942] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#FD8F1C]" /> Direct Desk Support: {settings.contactPhone}
            </p>
            <p>Email: {settings.contactEmail}</p>
          </div>
        </div>

        <div className="lg:col-span-7">
          {submitted ? (
            <div className="bg-[#F9F9FA] border border-[#D9E2EC] rounded-xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-[#0F2942]">Hotel Inquiry Logged</h3>
              <p className="text-sm text-[#486581]">
                Our travel specialists will follow up with available negotiated hotel rates for {destination}.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Destination City *</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Hotel Category</label>
                  <select
                    value={hotelTier}
                    onChange={(e) => setHotelTier(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  >
                    <option value="5-Star / Top Brand Resort">5-Star / Top Brand Resort</option>
                    <option value="4-Star Boutique / Business">4-Star Boutique / Business</option>
                    <option value="Budget & Value Stay">Budget & Value Stay</option>
                    <option value="Haram-Proximity Family Suite">Haram-Proximity Family Suite</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Check-in</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Check-out</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Guests & Rooms</label>
                  <input
                    type="text"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Your Name *</label>
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
                <label className="block text-xs font-semibold text-[#486581] mb-1">Special Preferences</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Breakfast included, airport shuttle, adjoining rooms..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Request Hotel Quotation'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
