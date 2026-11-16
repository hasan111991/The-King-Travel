import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Luggage, Star } from 'lucide-react';
import { FlightSearchWidget } from '../components/FlightSearchWidget';
import { SafeImage } from '../components/SafeImage';
import { useAgency } from '../context/AgencyContext';
import { ASSETS, convertMoney, formatMoney, TRAVEL_SERVICES } from '../lib/defaultData';

const WHY_CHOOSE = [
  {
    num: '01',
    title: 'Discounted Airline Tickets & 3 Check Bags Deal',
    body: 'Take off on top airlines to your favorite destinations at rock-bottom prices—including seasonal 3 checked bags deals at no extra cost.',
  },
  {
    num: '02',
    title: 'Negotiated Brand Hotel & Resort Rates',
    body: 'Stay at top brand hotels and resorts in exotic locations with specially negotiated agency rates paired with your flight dates.',
  },
  {
    num: '03',
    title: 'Umrah Season & Spiritual Guidance',
    body: 'Dedicated Makkah and Madinah Umrah coordination, Ziyarat planning, and Hajj advisory backed by attentive consultation.',
  },
  {
    num: '04',
    title: 'Custom Tours & Honeymoon Escapes',
    body: 'From Dubai Desert Glamour and Maldives Overwater Villas to Switzerland Alpine trains and Northern Pakistan valleys.',
  },
  {
    num: '05',
    title: 'Transparent Booking & Payment Tracking',
    body: 'Clear fare breakdowns, online portal tracking, receipt verification, and downloadable confirmation records.',
  },
  {
    num: '06',
    title: 'Personal Dallas-Based Support Desk',
    body: 'Speak directly with our travel consultants via phone, WhatsApp, or portal support inquiries before and after departure.',
  },
];

export function HomePage() {
  const {
    settings,
    destinations,
    travelPackages,
    specialOffers,
    testimonials,
    currency,
    setCurrency,
  } = useAgency();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeOffers = specialOffers.filter((o) => o.status === 'active');
  const activePackages = travelPackages.filter((p) => p.status === 'active');
  const featuredPackages = activePackages.filter((p) => p.featured).slice(0, 6);
  const internationalDests = destinations
    .filter((d) => !d.region || d.region === 'international')
    .slice(0, 8);
  const usaFeaturedDests = destinations.filter((d) => d.region === 'usa_featured');
  const domesticDests = destinations.filter((d) => d.region === 'domestic');

  const handleExploreFlights = (airportCode: string) => {
    const dep = new Date();
    dep.setDate(dep.getDate() + 14);
    const ret = new Date();
    ret.setDate(ret.getDate() + 21);
    const origin = airportCode === 'DFW' ? 'JFK' : 'DFW';
    const qs = new URLSearchParams({
      tripType: 'round-trip',
      from: origin,
      to: airportCode,
      dep: dep.toISOString().slice(0, 10),
      ret: ret.toISOString().slice(0, 10),
      adults: '1',
      children: '0',
      infants: '0',
      cabin: 'Economy',
    });
    navigate(`/flights?${qs.toString()}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[#0F2942] overflow-hidden">
        <img
          src={settings.heroBannerUrl?.trim() || ASSETS.heroAirline}
          alt={`${settings.agencyName || 'The King Travel'} Hero Banner`}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0F2942]/85 via-[#0F2942]/65 to-[#0F2942]/95"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="max-w-3xl mb-10">
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-[#FD8F1C] mb-3">
              {settings.agencyName || 'The King Travel'} · {settings.tagline || 'Your Ultimate Travel Partner!'}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold text-white leading-[1.12] tracking-tight">
              {settings.heroTitle || 'Discover the World with The King Travel'}
            </h1>
            <p className="text-base sm:text-lg text-[#E6ECF2] mt-4 max-w-2xl leading-relaxed">
              {settings.heroSubtitle ||
                'Your journey deserves exceptional service. Discover destinations, explore flight deals and travel with confidence.'}
            </p>
          </div>

          {/* 4-Tab Booking Search Widget */}
          <FlightSearchWidget showServiceTabs />

          {/* Clean Mode & Currency Utility Strip */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#BCCCDC]">
            <p>
              Platform Mode:{' '}
              <span className="font-semibold text-white">
                {settings.operatingMode === 'live'
                  ? 'Live Supplier Mode (Amadeus / Duffel / Agency Desk)'
                  : 'Demo Sandbox Mode (Sample Estimates & Full Booking Workflow)'}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="home-currency" className="text-[#BCCCDC]">
                Display Currency:
              </label>
              <select
                id="home-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-[#1C3D5A] border border-[#334E68] text-white rounded-md px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-[#FD8F1C]"
              >
                <option value="USD">USD ($)</option>
                <option value="PKR">PKR</option>
                <option value="AED">AED</option>
                <option value="SAR">SAR</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Flagship Migrated Promo Strip: Discounted Airline Tickets / 3 Check Bags Deal */}
      <section className="bg-[#FD8F1C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <Luggage className="w-8 h-8 shrink-0 text-white" aria-hidden="true" />
            <div>
              <h2 className="font-sans text-lg sm:text-xl font-bold text-white">
                Discounted Airline Tickets / 3 Check Bags Deal
              </h2>
              <p className="text-xs sm:text-sm text-white/95 mt-0.5">
                Get unbeatable rates with 3 checked bags at no extra cost! Take off on top airlines to your favorite destinations at rock-bottom prices.
              </p>
            </div>
          </div>
          <Link
            to="/flights"
            className="px-5 py-2.5 rounded-lg bg-[#0F2942] hover:bg-[#1C3D5A] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 self-start md:self-center"
          >
            Search Promotional Fares
          </Link>
        </div>
      </section>

      {/* Featured Travel Packages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
              Curated Itineraries
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
              Featured Travel Packages
            </h2>
          </div>
          <Link
            to="/packages"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2942] hover:text-[#FD8F1C] transition-colors whitespace-nowrap"
          >
            View All Packages <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredPackages.map((pkg) => (
            <article
              key={pkg.packageId}
              className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden flex flex-col hover:border-[#FD8F1C] transition-colors"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#0F2942]">
                <SafeImage
                  src={pkg.imageUrl}
                  alt={pkg.title}
                  code={pkg.category === 'honeymoon' ? 'HONEYMOON' : pkg.category === 'hajj_umrah' ? 'UMRAH' : 'TOUR'}
                  city={pkg.destination}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#627D98] mb-2">
                    <span className="font-semibold text-[#FD8F1C] capitalize">
                      {pkg.category.replace('_', ' & ')}
                    </span>
                    <span className="font-mono">{pkg.duration}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0F2942]">{pkg.title}</h3>
                  <p className="text-sm text-[#486581] mt-2 leading-relaxed">{pkg.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E6ECF2] flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-bold text-[#0F2942] tabular-nums">
                    {pkg.price
                      ? `From ${formatMoney(convertMoney(pkg.price, pkg.currency || 'USD', currency), currency)}`
                      : 'Custom Quotation'}
                  </span>
                  <Link
                    to={pkg.destinationSlug ? `/destinations/${pkg.destinationSlug}` : '/packages'}
                    className="px-4 py-2 rounded-lg bg-[#0F2942] hover:bg-[#1C3D5A] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Explore Package
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Popular International Destinations + Top Destinations From USA */}
      <section className="bg-white border-y border-[#E6ECF2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 space-y-16">
          {/* Popular International */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
                  Worldwide Gateways
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
                  Popular International Destinations
                </h2>
              </div>
              <Link
                to="/destinations"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2942] hover:text-[#FD8F1C] transition-colors whitespace-nowrap"
              >
                All Destinations <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {internationalDests.map((dest) => (
                <article
                  key={dest.destinationId}
                  className="group bg-[#F9F9FA] rounded-xl border border-[#D9E2EC] overflow-hidden flex flex-col hover:border-[#FD8F1C] transition-colors"
                >
                  <Link
                    to={`/destinations/${dest.slug || dest.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="aspect-[4/3] w-full overflow-hidden bg-[#0F2942] block"
                  >
                    <SafeImage
                      src={dest.imageUrl}
                      alt={`${dest.name}, ${dest.country}`}
                      code={dest.airportCode}
                      city={dest.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          to={`/destinations/${dest.slug || dest.name.toLowerCase().replace(/\s+/g, '-')}`}
                          className="text-base font-bold text-[#0F2942] hover:text-[#FD8F1C]"
                        >
                          {dest.name}
                        </Link>
                        <span className="font-mono text-xs font-semibold text-[#FD8F1C]">
                          {dest.airportCode}
                        </span>
                      </div>
                      <p className="text-xs text-[#627D98] mt-0.5">{dest.country}</p>
                      {dest.startingFare ? (
                        <p className="text-xs text-[#243B53] mt-2 tabular-nums">
                          Est. from{' '}
                          <span className="font-semibold text-[#0F2942]">
                            {formatMoney(
                              convertMoney(dest.startingFare, dest.currency || 'USD', currency),
                              currency
                            )}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExploreFlights(dest.airportCode)}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#0F2942] hover:bg-[#1C3D5A] text-white text-xs font-semibold transition-colors"
                      >
                        Explore Flights
                      </button>
                      <Link
                        to={`/destinations/${dest.slug || dest.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="py-2 px-3 rounded-lg border border-[#D9E2EC] bg-white text-xs font-semibold text-[#0F2942] hover:border-[#FD8F1C]"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Top Destinations From USA */}
          {usaFeaturedDests.length > 0 && (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
                  Departing Dallas & US Hubs
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2942]">
                  Top Destinations From USA
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {usaFeaturedDests.map((dest) => (
                  <div
                    key={dest.destinationId}
                    className="bg-[#F9F9FA] border border-[#D9E2EC] rounded-xl p-4 flex flex-col justify-between hover:border-[#FD8F1C] transition-colors"
                  >
                    <div>
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-base font-bold text-[#0F2942]">{dest.name}</h3>
                        <span className="font-mono text-xs font-semibold text-[#FD8F1C]">
                          {dest.airportCode}
                        </span>
                      </div>
                      <p className="text-xs text-[#486581] mt-1.5 leading-relaxed">{dest.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExploreFlights(dest.airportCode)}
                      className="mt-4 w-full py-2 rounded-lg bg-white border border-[#D9E2EC] hover:bg-[#0F2942] hover:text-white text-[#0F2942] text-xs font-semibold transition-colors"
                    >
                      Flights from USA
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domestic & Northern Pakistan */}
          {domesticDests.length > 0 && (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
                  Scenic Valleys & City Hubs
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2942]">
                  Domestic & Northern Pakistan Destinations
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {domesticDests.map((dest) => (
                  <div
                    key={dest.destinationId}
                    className="bg-[#F9F9FA] border border-[#D9E2EC] rounded-xl p-4 flex flex-col justify-between hover:border-[#FD8F1C] transition-colors"
                  >
                    <div>
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-base font-bold text-[#0F2942]">{dest.name}</h3>
                        <span className="font-mono text-xs font-semibold text-[#FD8F1C]">
                          {dest.airportCode}
                        </span>
                      </div>
                      <p className="text-xs text-[#627D98] mt-0.5">{dest.city}</p>
                      <p className="text-xs text-[#486581] mt-2 leading-relaxed">{dest.description}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleExploreFlights(dest.airportCode)}
                        className="flex-1 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
                      >
                        Explore Flights
                      </button>
                      <Link
                        to={`/destinations/${dest.slug || dest.destinationId}`}
                        className="py-2 px-3 rounded-lg border border-[#D9E2EC] bg-white text-xs font-semibold text-[#0F2942]"
                      >
                        Guide
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Special Travel Offers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
              Exclusive Agency Promotions
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
              Special Travel Offers
            </h2>
          </div>
          <Link
            to="/flights"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2942] hover:text-[#FD8F1C]"
          >
            Search All Fares <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeOffers.map((offer) => (
            <div
              key={offer.offerId}
              className="bg-white border border-[#D9E2EC] rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#627D98] mb-3">
                  <span className="font-semibold text-[#FD8F1C]">{offer.discountLabel}</span>
                  <span>Valid until {offer.validUntil}</span>
                </div>
                <h3 className="text-lg font-bold text-[#0F2942]">{offer.title}</h3>
                {offer.subtitle && (
                  <p className="text-xs font-medium text-[#486581] mt-1">{offer.subtitle}</p>
                )}
                <p className="text-sm text-[#486581] mt-3 leading-relaxed">{offer.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E6ECF2] flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-[#0F2942]">
                  {offer.promoCode ? `Code: ${offer.promoCode}` : `Route: ${offer.destination}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleExploreFlights(offer.destination || 'DXB')}
                  className="px-4 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Explore Deal
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-white border-y border-[#E6ECF2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
              Why Choose Us
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
              Why Travel With The King Travel?
            </h2>
            <p className="text-sm sm:text-base text-[#486581] mt-3 leading-relaxed">
              At The King Travel, we believe that travel is not just about reaching a destination – it’s about creating unforgettable memories, experiencing new cultures, and exploring the world with comfort and confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {WHY_CHOOSE.map((item) => (
              <div key={item.num} className="pt-4 border-t border-[#D9E2EC]">
                <span className="font-mono text-xs font-semibold text-[#FD8F1C]">{item.num}</span>
                <h3 className="text-lg font-bold text-[#0F2942] mt-2">{item.title}</h3>
                <p className="text-sm text-[#486581] mt-2 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Travel Services */}
      <section className="bg-[#0F2942] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
                Complete Travel Capabilities
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                Travel Services
              </h2>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FD8F1C] hover:underline"
            >
              Explore All Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRAVEL_SERVICES.map((svc) => (
              <div
                key={svc.id}
                className="bg-[#1C3D5A]/70 border border-[#334E68] rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-[#FD8F1C]">
                    {svc.number}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">{svc.title}</h3>
                  <p className="text-xs sm:text-sm text-[#BCCCDC] mt-2 leading-relaxed">
                    {svc.description}
                  </p>
                </div>
                <Link
                  to={`/contact?subject=${encodeURIComponent(`Inquiry: ${svc.title}`)}`}
                  className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#FD8F1C] hover:underline"
                >
                  Request Assistance <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold tracking-wider text-[#FD8F1C] mb-2">
            Verified Traveler Experiences
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
            Customer Testimonials
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <blockquote
              key={t.testimonialId}
              className="bg-white border border-[#D9E2EC] rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-[#FD8F1C] mb-3" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: Math.round(t.rating || 5) }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#FD8F1C]" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-sm text-[#243B53] leading-relaxed">"{t.quote}"</p>
              </div>
              <footer className="mt-5 pt-4 border-t border-[#E6ECF2]">
                <p className="text-sm font-bold text-[#0F2942]">{t.customerName}</p>
                <p className="text-xs text-[#627D98] mt-0.5">{t.route}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-white border-t border-[#E6ECF2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-display text-3xl font-bold text-[#0F2942] text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="divide-y divide-[#D9E2EC] border-y border-[#D9E2EC]">
            {(settings.faqs || []).map((faq, idx) => (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                  className="w-full flex items-center justify-between gap-4 text-left py-1"
                >
                  <span className="text-base font-semibold text-[#0F2942]">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#627D98] shrink-0 transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {openFaq === idx && (
                  <p className="mt-2.5 text-sm text-[#486581] leading-relaxed pr-8">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
