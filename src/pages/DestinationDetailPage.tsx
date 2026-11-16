import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowLeft, Check, CheckCircle2, Plane } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { convertMoney, formatMoney } from '../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';

export function DestinationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { destinations, travelPackages, currency } = useAgency();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const destination = useMemo(() => {
    const cleanSlug = (slug || '').toLowerCase();
    return destinations.find(
      (d) =>
        (d.slug && d.slug.toLowerCase() === cleanSlug) ||
        d.name.toLowerCase().replace(/\s+/g, '-') === cleanSlug ||
        d.destinationId === slug
    );
  }, [destinations, slug]);

  const matchingPackages = useMemo(() => {
    if (!destination) return [];
    const targetSlug = (destination.slug || slug || '').toLowerCase();
    return travelPackages.filter(
      (p) =>
        p.status === 'active' &&
        ((p.destinationSlug && p.destinationSlug.toLowerCase() === targetSlug) ||
          p.destination.toLowerCase() === destination.name.toLowerCase())
    );
  }, [travelPackages, destination, slug]);

  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [selectedPkgTitle, setSelectedPkgTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!destination) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0F2942]">Destination Not Found</h1>
        <p className="text-sm text-[#486581]">
          Explore all featured destinations or search available flights directly.
        </p>
        <Link
          to="/destinations"
          className="inline-block px-5 py-2.5 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
        >
          View All Destinations
        </Link>
      </div>
    );
  }

  const handleSearchFlights = () => {
    const dep = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const ret = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
    const origin = destination.airportCode === 'DFW' ? 'JFK' : 'DFW';
    navigate(
      `/flights?tripType=round-trip&from=${origin}&to=${destination.airportCode}&dep=${dep}&ret=${ret}&adults=1&cabin=Economy`
    );
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        subject: `Destination Inquiry: ${destination.name}${selectedPkgTitle ? ` (${selectedPkgTitle})` : ''}`,
        message: message.trim() || `Requesting flight and package quote for ${destination.name}.`,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
      setMessage('');
      showToast('Inquiry Sent', `Our desk received your inquiry for ${destination.name}.`, 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `inquiries/${inquiryId}`);
      } catch {
        showToast('Error', 'Unable to send inquiry right now.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <Link
        to="/destinations"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#486581] hover:text-[#0F2942]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Destinations
      </Link>

      {/* Hero Destination Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-[#D9E2EC] rounded-2xl overflow-hidden">
        <div className="lg:col-span-6 aspect-[4/3] lg:aspect-auto bg-[#0F2942]">
          <SafeImage
            src={destination.imageUrl}
            alt={`${destination.name}, ${destination.country}`}
            code={destination.airportCode}
            city={destination.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-3 text-xs font-semibold text-[#FD8F1C]">
              <span>{destination.country}</span>
              <span>·</span>
              <span className="font-mono">Airport: {destination.airportCode}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942] mt-2">
              {destination.name}
            </h1>
            {destination.city && (
              <p className="text-sm font-medium text-[#627D98] mt-1">{destination.city}</p>
            )}
            <p className="text-sm sm:text-base text-[#486581] mt-4 leading-relaxed">
              {destination.description}
            </p>
          </div>

          <div className="pt-4 border-t border-[#E6ECF2] flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#627D98]">Estimated Airfare From</p>
              <p className="font-mono text-2xl font-bold text-[#0F2942] tabular-nums">
                {destination.startingFare
                  ? formatMoney(
                      convertMoney(destination.startingFare, destination.currency || 'USD', currency),
                      currency
                    )
                  : 'Custom Quote'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSearchFlights}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold"
            >
              <Plane className="w-4 h-4" /> Explore Flights to {destination.airportCode}
            </button>
          </div>
        </div>
      </div>

      {/* Matching Packages */}
      {matchingPackages.length > 0 && (
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-[#0F2942]">
            Available {destination.name} Travel Packages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matchingPackages.map((pkg) => (
              <div
                key={pkg.packageId}
                className="bg-white border border-[#D9E2EC] rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#627D98] mb-2">
                    <span className="font-semibold text-[#FD8F1C] capitalize">
                      {pkg.category.replace('_', ' & ')}
                    </span>
                    <span className="font-mono">{pkg.duration}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0F2942]">{pkg.title}</h3>
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

                <div className="mt-5 pt-4 border-t border-[#E6ECF2] flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-[#0F2942] tabular-nums">
                    {pkg.price
                      ? `From ${formatMoney(convertMoney(pkg.price, pkg.currency || 'USD', currency), currency)}`
                      : 'Custom Quotation'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPkgTitle(pkg.title);
                      document.getElementById('dest-inquiry')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
                  >
                    Inquire for Package
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Booking Inquiry Form */}
      <section
        id="dest-inquiry"
        className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 max-w-3xl"
      >
        <h2 className="font-display text-2xl font-bold text-[#0F2942]">
          Request a Custom {destination.name} Itinerary
        </h2>
        <p className="text-xs sm:text-sm text-[#486581] mt-1 mb-5">
          Tell us your preferred departure dates and group size. Our travel consultants will respond promptly.
        </p>

        {submitted ? (
          <div className="bg-[#F9F9FA] border border-[#D9E2EC] rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
            <p className="text-sm font-bold text-[#0F2942]">Inquiry Logged</p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
            >
              Send Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleInquirySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
              />
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
              />
              <input
                type="tel"
                required
                placeholder="Phone / WhatsApp"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
              />
            </div>
            {selectedPkgTitle && (
              <p className="text-xs font-semibold text-[#FD8F1C]">
                Selected Package: {selectedPkgTitle}
              </p>
            )}
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Share your travel dates, origin city, and preferences for ${destination.name}...`}
              className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold"
            >
              {submitting ? 'Submitting...' : 'Submit Booking Inquiry'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
