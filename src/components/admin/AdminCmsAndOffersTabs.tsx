import React, { useEffect, useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '../../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../../lib/firebase';
import type {
  AgencySettings,
  CabinClass,
  DestinationItem,
  ManualFlightOffer,
  SpecialOfferItem,
  TestimonialItem,
  TravelPackageItem,
} from '../../types/travel';

export function buildSanitizedSettingsPayload(s: AgencySettings) {
  return {
    agencyName: s.agencyName,
    tagline: s.tagline || '',
    executiveName: s.executiveName || '',
    executiveRole: s.executiveRole || '',
    operatingMode: s.operatingMode,
    defaultCurrency: s.defaultCurrency || 'USD',
    whatsappNumber: s.whatsappNumber || '',
    contactEmail: s.contactEmail || '',
    contactPhone: s.contactPhone || '',
    secondaryPhone: s.secondaryPhone || '',
    officeAddress: s.officeAddress || '',
    socialLinks: s.socialLinks || {},
    paymentMethods: s.paymentMethods,
    bankDetails: s.bankDetails,
    faqs: Array.isArray(s.faqs) ? s.faqs.slice(0, 30) : [],
    legalPages: s.legalPages,
    heroTitle: s.heroTitle || '',
    heroSubtitle: s.heroSubtitle || '',
    updatedAt: serverTimestamp(),
  };
}

interface AdminOffersTabProps {
  offers: ManualFlightOffer[];
  onLogAudit: (action: string, targetCollection: string, targetId: string, details: string) => Promise<void>;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function AdminFlightOffersTab({ offers, onLogAudit, onToast }: AdminOffersTabProps) {
  const [airline, setAirline] = useState('');
  const [airlineCode, setAirlineCode] = useState('EK');
  const [flightNumber, setFlightNumber] = useState('');
  const [origin, setOrigin] = useState('Dallas');
  const [originCode, setOriginCode] = useState('DFW');
  const [destination, setDestination] = useState('Dubai');
  const [destinationCode, setDestinationCode] = useState('DXB');
  const [departureDate, setDepartureDate] = useState('');
  const [cabinClass, setCabinClass] = useState<CabinClass>('Economy');
  const [price, setPrice] = useState('890');
  const [currency, setCurrency] = useState('USD');
  const [baggage, setBaggage] = useState('3 Checked Bags Deal Promo');
  const [validity, setValidity] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const offerId = generateId('flt');
    try {
      await setDoc(doc(db, 'flightOffers', offerId), {
        offerId,
        airline: airline.trim(),
        airlineCode: airlineCode.trim().toUpperCase(),
        flightNumber: flightNumber.trim().toUpperCase(),
        origin: origin.trim(),
        originCode: originCode.trim().toUpperCase(),
        destination: destination.trim(),
        destinationCode: destinationCode.trim().toUpperCase(),
        departureDate,
        cabinClass,
        price: Number(price || 0),
        currency,
        baggage: baggage.trim(),
        validity,
        notes: 'Manual agency quotation offer; availability confirmed upon request.',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await onLogAudit('Created manual flight offer', 'flightOffers', offerId, `${originCode}->${destinationCode}`);
      onToast('Offer Added', 'Manual quotation offer is now visible in flight search.', 'success');
      setAirline('');
      setFlightNumber('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `flightOffers/${offerId}`);
      } catch {
        onToast('Error', 'Unable to save flight offer.', 'error');
      }
    }
  };

  const handleDelete = async (offerId: string) => {
    try {
      await deleteDoc(doc(db, 'flightOffers', offerId));
      await onLogAudit('Deleted flight offer', 'flightOffers', offerId, 'Removed manual offer');
      onToast('Deleted', 'Flight offer removed.', 'info');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `flightOffers/${offerId}`);
      } catch {
        onToast('Error', 'Could not delete offer.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#102A43]">Add Manual Flight Offer (Quotation Only)</h2>
          <span className="text-xs text-[#627D98]">Displayed as Agency Quotation, not live GDS inventory</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input required placeholder="Airline Name" value={airline} onChange={(e) => setAirline(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs" />
          <input required placeholder="Code (PK)" maxLength={4} value={airlineCode} onChange={(e) => setAirlineCode(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-mono" />
          <input required placeholder="Flight No (PK-213)" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-mono" />
          <select value={cabinClass} onChange={(e) => setCabinClass(e.target.value as CabinClass)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs">
            <option value="Economy">Economy</option>
            <option value="Premium Economy">Premium Economy</option>
            <option value="Business">Business</option>
            <option value="First Class">First Class</option>
          </select>
          <input required placeholder="Origin City" value={origin} onChange={(e) => setOrigin(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs" />
          <input required placeholder="Origin IATA (KHI)" maxLength={3} value={originCode} onChange={(e) => setOriginCode(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-mono" />
          <input required placeholder="Destination City" value={destination} onChange={(e) => setDestination(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs" />
          <input required placeholder="Dest IATA (DXB)" maxLength={3} value={destinationCode} onChange={(e) => setDestinationCode(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-mono" />
          <input required type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs" />
          <input required type="number" min={0} placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-mono" />
          <input required placeholder="Baggage Allowance" value={baggage} onChange={(e) => setBaggage(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs" />
          <input required type="date" title="Valid Until" value={validity} onChange={(e) => setValidity(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs" />
        </div>
        <div className="flex items-center justify-between">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-3 py-1.5 rounded-lg border border-[#D9E2EC] text-xs">
            <option value="USD">USD</option>
            <option value="PKR">PKR</option>
            <option value="AED">AED</option>
            <option value="SAR">SAR</option>
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
          </select>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Save Flight Offer
          </button>
        </div>
      </form>

      <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F9FC] text-[#486581] border-b border-[#D9E2EC]">
            <tr>
              <th className="py-3 px-4 font-semibold">Airline</th>
              <th className="py-3 px-4 font-semibold">Route</th>
              <th className="py-3 px-4 font-semibold">Departure</th>
              <th className="py-3 px-4 font-semibold">Valid Until</th>
              <th className="py-3 px-4 font-semibold text-right">Quotation</th>
              <th className="py-3 px-4 font-semibold text-right">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6ECF2]">
            {offers.map((o) => (
              <tr key={o.offerId}>
                <td className="py-3 px-4 font-semibold text-[#102A43]">{o.airline} ({o.flightNumber})</td>
                <td className="py-3 px-4 font-mono">{o.originCode} → {o.destinationCode}</td>
                <td className="py-3 px-4 tabular-nums">{o.departureDate}</td>
                <td className="py-3 px-4 tabular-nums">{o.validity}</td>
                <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">{formatMoney(o.price, o.currency)}</td>
                <td className="py-3 px-4 text-right">
                  <button type="button" onClick={() => handleDelete(o.offerId)} className="text-red-600 hover:underline">
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AdminCmsTabProps {
  settings: AgencySettings;
  destinations: DestinationItem[];
  travelPackages: TravelPackageItem[];
  specialOffers: SpecialOfferItem[];
  testimonials: TestimonialItem[];
  onLogAudit: (action: string, targetCollection: string, targetId: string, details: string) => Promise<void>;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function AdminCmsAndSettingsTab({
  settings,
  destinations,
  travelPackages,
  specialOffers,
  testimonials,
  onLogAudit,
  onToast,
}: AdminCmsTabProps) {
  const [form, setForm] = useState<AgencySettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // Special Offer quick create
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDest, setOfferDest] = useState('DXB');
  const [offerBadge, setOfferBadge] = useState('3 Check Bags Deal');
  const [offerValid, setOfferValid] = useState('2026-12-31');
  const [offerDesc, setOfferDesc] = useState('');

  // Testimonial quick create
  const [custName, setCustName] = useState('');
  const [custRoute, setCustRoute] = useState('');
  const [custQuote, setCustQuote] = useState('');

  // Destination quick create
  const [destName, setDestName] = useState('');
  const [destSlug, setDestSlug] = useState('');
  const [destCountry, setDestCountry] = useState('');
  const [destCode, setDestCode] = useState('');
  const [destRegion, setDestRegion] = useState<'international' | 'usa_featured' | 'domestic'>('international');
  const [destDesc, setDestDesc] = useState('');
  const [destFare, setDestFare] = useState('750');

  // Travel Package quick create
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgCategory, setPkgCategory] = useState<TravelPackageItem['category']>('tour');
  const [pkgDestination, setPkgDestination] = useState('');
  const [pkgDuration, setPkgDuration] = useState('7 Days / 6 Nights');
  const [pkgPrice, setPkgPrice] = useState('1450');
  const [pkgServices, setPkgServices] = useState('Round-Trip Flights, Hotel Stay, Airport Transfers');
  const [pkgDesc, setPkgDesc] = useState('');

  const saveAgencySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = buildSanitizedSettingsPayload(form);
      const batch = writeBatch(db);
      batch.set(doc(db, 'settings', 'public'), payload);
      batch.set(doc(db, 'websiteSettings', 'public'), payload);
      await batch.commit();
      await onLogAudit('Updated agency settings & legal pages', 'settings', 'public', form.agencyName);
      onToast('Settings Saved', 'Public website content and payment details updated.', 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, 'settings/public');
      } catch {
        onToast('Error', 'Unable to save settings.', 'error');
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const addSpecialOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const offerId = generateId('prom');
    try {
      await setDoc(doc(db, 'offers', offerId), {
        offerId,
        title: offerTitle.trim(),
        description: offerDesc.trim(),
        destination: offerDest.trim().toUpperCase(),
        discountLabel: offerBadge.trim(),
        validUntil: offerValid,
        status: 'active',
        updatedAt: serverTimestamp(),
      });
      await onLogAudit('Created special offer', 'offers', offerId, offerTitle.trim());
      setOfferTitle('');
      setOfferDesc('');
      onToast('Offer Published', 'Special offer added to homepage.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `offers/${offerId}`);
    }
  };

  const addTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    const testimonialId = generateId('tst');
    try {
      await setDoc(doc(db, 'testimonials', testimonialId), {
        testimonialId,
        customerName: custName.trim(),
        route: custRoute.trim(),
        rating: 5,
        quote: custQuote.trim(),
        status: 'published',
        updatedAt: serverTimestamp(),
      });
      await onLogAudit('Published testimonial', 'testimonials', testimonialId, custName.trim());
      setCustName('');
      setCustRoute('');
      setCustQuote('');
      onToast('Testimonial Published', 'Review added.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `testimonials/${testimonialId}`);
    }
  };

  const addDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    const destinationId = generateId('dst');
    const generatedSlug = (destSlug.trim() || destName.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    try {
      await setDoc(doc(db, 'destinations', destinationId), {
        destinationId,
        slug: generatedSlug,
        name: destName.trim(),
        country: destCountry.trim(),
        airportCode: destCode.trim().toUpperCase(),
        region: destRegion,
        description: destDesc.trim(),
        startingFare: Number(destFare || 0),
        currency: 'USD',
        featured: true,
        order: destinations.length + 1,
        updatedAt: serverTimestamp(),
      });
      await onLogAudit('Added destination', 'destinations', destinationId, destName.trim());
      setDestName('');
      setDestSlug('');
      setDestCountry('');
      setDestCode('');
      setDestDesc('');
      onToast('Destination Added', `${destName} added to destinations.`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `destinations/${destinationId}`);
    }
  };

  const addTravelPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const packageId = generateId('pkg');
    const destSlugVal = pkgDestination
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const includedServices = pkgServices
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 15);
    try {
      await setDoc(doc(db, 'travelPackages', packageId), {
        packageId,
        title: pkgTitle.trim(),
        category: pkgCategory,
        destination: pkgDestination.trim(),
        destinationSlug: destSlugVal,
        duration: pkgDuration.trim(),
        price: Number(pkgPrice || 0),
        currency: 'USD',
        description: pkgDesc.trim(),
        includedServices,
        featured: true,
        status: 'active',
        updatedAt: serverTimestamp(),
      });
      await onLogAudit('Created travel package', 'travelPackages', packageId, pkgTitle.trim());
      setPkgTitle('');
      setPkgDestination('');
      setPkgDesc('');
      onToast('Package Published', 'Travel package is now live on the website.', 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `travelPackages/${packageId}`);
      } catch {
        onToast('Error', 'Unable to save travel package.', 'error');
      }
    }
  };

  const togglePackageStatus = async (pkg: TravelPackageItem) => {
    const nextStatus = pkg.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'travelPackages', pkg.packageId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      onToast('Status Updated', `${pkg.title} marked ${nextStatus}.`, 'info');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `travelPackages/${pkg.packageId}`);
      } catch {
        onToast('Error', 'Unable to update package status.', 'error');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Business Settings, Contact, Bank Details & Legal Pages */}
      <form onSubmit={saveAgencySettings} className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E6ECF2] pb-3">
          <h2 className="text-base font-bold text-[#0F2942]">Business Settings, Payments & Legal CMS</h2>
          <button type="submit" disabled={savingSettings} className="px-5 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold">
            {savingSettings ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Hero Headline</label>
            <input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Executive / CEO Name</label>
            <input value={form.executiveName || ''} onChange={(e) => setForm({ ...form, executiveName: e.target.value })} placeholder="M Kamal Siddiqui" className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Executive Title</label>
            <input value={form.executiveRole || ''} onChange={(e) => setForm({ ...form, executiveRole: e.target.value })} placeholder="CEO of THE KING TRAVEL" className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">WhatsApp Number (digits with country code)</label>
            <input value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="15716209414" className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Contact Email</label>
            <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Primary Phone</label>
            <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Secondary Phone</label>
            <input value={form.secondaryPhone || ''} onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })} placeholder="+1 972 815 7405" className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold text-[#486581] mb-1">Office Address</label>
            <input value={form.officeAddress} onChange={(e) => setForm({ ...form, officeAddress: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
        </div>

        <div className="pt-4 border-t border-[#E6ECF2] space-y-3 text-xs">
          <h3 className="font-bold text-[#0F2942]">Official Social Media Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              placeholder="Facebook URL"
              value={form.socialLinks?.facebook || ''}
              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, facebook: e.target.value } })}
              className="px-3 py-2 rounded-lg border border-[#D9E2EC]"
            />
            <input
              placeholder="YouTube URL"
              value={form.socialLinks?.youtube || ''}
              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, youtube: e.target.value } })}
              className="px-3 py-2 rounded-lg border border-[#D9E2EC]"
            />
            <input
              placeholder="Instagram URL"
              value={form.socialLinks?.instagram || ''}
              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })}
              className="px-3 py-2 rounded-lg border border-[#D9E2EC]"
            />
            <input
              placeholder="TikTok URL"
              value={form.socialLinks?.tiktok || ''}
              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, tiktok: e.target.value } })}
              className="px-3 py-2 rounded-lg border border-[#D9E2EC]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#E6ECF2] space-y-3 text-xs">
          <h3 className="font-bold text-[#0F2942]">Bank Transfer, JazzCash & Easypaisa Instructions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Bank Name" value={form.bankDetails.bankName} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, bankName: e.target.value } })} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <input placeholder="Account Title" value={form.bankDetails.accountTitle} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, accountTitle: e.target.value } })} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <input placeholder="Account Number" value={form.bankDetails.accountNumber} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, accountNumber: e.target.value } })} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <input placeholder="IBAN / Routing" value={form.bankDetails.iban} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, iban: e.target.value } })} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <input placeholder="JazzCash Number" value={form.bankDetails.jazzCashNumber} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, jazzCashNumber: e.target.value } })} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <input placeholder="Easypaisa Number" value={form.bankDetails.easypaisaNumber} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, easypaisaNumber: e.target.value } })} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <textarea rows={2} placeholder="Payment Instructions" value={form.bankDetails.instructions} onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, instructions: e.target.value } })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
        </div>

        <div className="pt-4 border-t border-[#E6ECF2] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Terms & Conditions</label>
            <textarea rows={3} value={form.legalPages.terms} onChange={(e) => setForm({ ...form, legalPages: { ...form.legalPages, terms: e.target.value } })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Privacy Policy</label>
            <textarea rows={3} value={form.legalPages.privacy} onChange={(e) => setForm({ ...form, legalPages: { ...form.legalPages, privacy: e.target.value } })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Refund Policy</label>
            <textarea rows={3} value={form.legalPages.refundPolicy} onChange={(e) => setForm({ ...form, legalPages: { ...form.legalPages, refundPolicy: e.target.value } })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
          <div>
            <label className="block font-semibold text-[#486581] mb-1">Cancellation Policy</label>
            <textarea rows={3} value={form.legalPages.cancellationPolicy} onChange={(e) => setForm({ ...form, legalPages: { ...form.legalPages, cancellationPolicy: e.target.value } })} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          </div>
        </div>
      </form>

      {/* Travel Packages CMS */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6ECF2] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#0F2942]">
              Travel, Honeymoon & Hajj/Umrah Packages ({travelPackages.length})
            </h3>
            <p className="text-[#627D98] mt-0.5">
              Packages appear on the Homepage, Packages Catalog, Hajj & Umrah Page, and matching Destination Detail Pages.
            </p>
          </div>
        </div>

        <form onSubmit={addTravelPackage} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input required placeholder="Package Title (e.g. Dubai Honeymoon Escape)" value={pkgTitle} onChange={(e) => setPkgTitle(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          <select value={pkgCategory} onChange={(e) => setPkgCategory(e.target.value as TravelPackageItem['category'])} className="px-3 py-2 rounded-lg border border-[#D9E2EC]">
            <option value="tour">Tour Package</option>
            <option value="honeymoon">Honeymoon Package</option>
            <option value="hajj_umrah">Hajj & Umrah</option>
            <option value="holiday">Holiday Package</option>
          </select>
          <input required placeholder="Destination (e.g. Dubai)" value={pkgDestination} onChange={(e) => setPkgDestination(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          <input required placeholder="Duration (e.g. 7 Days / 6 Nights)" value={pkgDuration} onChange={(e) => setPkgDuration(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          <input type="number" min={0} placeholder="Starting Price (USD)" value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] font-mono" />
          <input placeholder="Included Services (comma-separated)" value={pkgServices} onChange={(e) => setPkgServices(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          <textarea required rows={2} placeholder="Package description" value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} className="sm:col-span-2 px-3 py-2 rounded-lg border border-[#D9E2EC]" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#0F2942] text-white font-semibold self-end h-10">
            Publish Travel Package
          </button>
        </form>

        <div className="divide-y divide-[#E6ECF2] max-h-64 overflow-y-auto">
          {travelPackages.map((pkg) => (
            <div key={pkg.packageId} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#0F2942]">
                  {pkg.title}{' '}
                  <span className="font-normal text-[#627D98]">
                    · {pkg.category.replace('_', ' & ')} · {pkg.destination} ({pkg.duration})
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {pkg.price ? (
                  <span className="font-mono font-semibold text-[#0F2942] tabular-nums">
                    {formatMoney(pkg.price, pkg.currency || 'USD')}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => togglePackageStatus(pkg)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-semibold ${
                    pkg.status === 'active'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-[#D9E2EC] bg-[#F9F9FA] text-[#627D98]'
                  }`}
                >
                  {pkg.status}
                </button>
                <button
                  type="button"
                  onClick={() => deleteDoc(doc(db, 'travelPackages', pkg.packageId))}
                  className="text-red-600"
                  title="Delete package"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Offers, Destinations, Testimonials Managers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Special Offers */}
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[#0F2942]">Special Offers ({specialOffers.length})</h3>
          <form onSubmit={addSpecialOffer} className="space-y-2">
            <input required placeholder="Offer Title" value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Dest Code (DXB)" value={offerDest} onChange={(e) => setOfferDest(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
              <input required placeholder="Label" value={offerBadge} onChange={(e) => setOfferBadge(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            </div>
            <input required type="date" value={offerValid} onChange={(e) => setOfferValid(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <textarea required rows={2} placeholder="Offer description" value={offerDesc} onChange={(e) => setOfferDesc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <button type="submit" className="w-full py-2 rounded-lg bg-[#0F2942] text-white font-semibold">Add Offer</button>
          </form>
          <div className="divide-y divide-[#E6ECF2]">
            {specialOffers.map((o) => (
              <div key={o.offerId} className="py-2 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-[#0F2942]">{o.title}</span>
                <button type="button" onClick={() => deleteDoc(doc(db, 'offers', o.offerId))} className="text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Destinations */}
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[#0F2942]">Destinations ({destinations.length})</h3>
          <form onSubmit={addDestination} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="City / Name" value={destName} onChange={(e) => setDestName(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
              <input placeholder="URL Slug (auto)" value={destSlug} onChange={(e) => setDestSlug(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Country" value={destCountry} onChange={(e) => setDestCountry(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
              <input required placeholder="IATA (DXB)" maxLength={3} value={destCode} onChange={(e) => setDestCode(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={destRegion} onChange={(e) => setDestRegion(e.target.value as 'international' | 'usa_featured' | 'domestic')} className="px-3 py-2 rounded-lg border border-[#D9E2EC]">
                <option value="international">International</option>
                <option value="usa_featured">Top From USA</option>
                <option value="domestic">Domestic</option>
              </select>
              <input type="number" placeholder="Est. Fare (USD)" value={destFare} onChange={(e) => setDestFare(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            </div>
            <textarea required rows={2} placeholder="Short description" value={destDesc} onChange={(e) => setDestDesc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <button type="submit" className="w-full py-2 rounded-lg bg-[#0F2942] text-white font-semibold">Add Destination</button>
          </form>
          <div className="divide-y divide-[#E6ECF2] max-h-48 overflow-y-auto">
            {destinations.map((d) => (
              <div key={d.destinationId} className="py-2 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-[#0F2942]">{d.name} ({d.airportCode})</span>
                <button type="button" onClick={() => deleteDoc(doc(db, 'destinations', d.destinationId))} className="text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[#0F2942]">Testimonials ({testimonials.length})</h3>
          <form onSubmit={addTestimonial} className="space-y-2">
            <input required placeholder="Customer Name" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <input required placeholder="Route (e.g. Dallas to Dubai)" value={custRoute} onChange={(e) => setCustRoute(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <textarea required rows={3} placeholder="Customer review quote" value={custQuote} onChange={(e) => setCustQuote(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <button type="submit" className="w-full py-2 rounded-lg bg-[#0F2942] text-white font-semibold">Publish Review</button>
          </form>
          <div className="divide-y divide-[#E6ECF2] max-h-48 overflow-y-auto">
            {testimonials.map((t) => (
              <div key={t.testimonialId} className="py-2 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-[#0F2942]">{t.customerName}</span>
                <button type="button" onClick={() => deleteDoc(doc(db, 'testimonials', t.testimonialId))} className="text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
