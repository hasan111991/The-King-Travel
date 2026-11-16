import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  DEFAULT_AGENCY_SETTINGS,
  DEFAULT_DESTINATIONS,
  DEFAULT_HOTELS,
  DEFAULT_MANUAL_OFFERS,
  DEFAULT_SPECIAL_OFFERS,
  DEFAULT_TESTIMONIALS,
  DEFAULT_TRAVEL_PACKAGES,
} from '../lib/defaultData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { buildSanitizedSettingsPayload, mergeAgencySettings } from '../lib/settingsUtils';
import type {
  AgencySettings,
  DestinationItem,
  FaqRecord,
  HotelItem,
  ManualFlightOffer,
  SpecialOfferItem,
  TestimonialItem,
  TravelPackageItem,
} from '../types/travel';

interface AgencyContextValue {
  settings: AgencySettings;
  destinations: DestinationItem[];
  travelPackages: TravelPackageItem[];
  specialOffers: SpecialOfferItem[];
  testimonials: TestimonialItem[];
  manualFlightOffers: ManualFlightOffer[];
  hotels: HotelItem[];
  faqs: FaqRecord[];
  currency: string;
  setCurrency: (curr: string) => void;
  catalogLoaded: boolean;
  hasFirestoreCatalog: boolean;
  seedDefaultCatalog: () => Promise<void>;
}

const AgencyContext = createContext<AgencyContextValue | null>(null);

function extractTimestampMs(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const ts = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof ts.toMillis === 'function') {
    return ts.toMillis();
  }
  if (typeof ts.seconds === 'number') {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
  }
  return 0;
}

const DEFAULT_FAQ_RECORDS: FaqRecord[] = DEFAULT_AGENCY_SETTINGS.faqs.map((faq, idx) => ({
  faqId: `faq_default_${idx + 1}`,
  question: faq.question,
  answer: faq.answer,
  category: 'General',
  order: idx + 1,
  status: 'published',
}));

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_AGENCY_SETTINGS);
  const [destinations, setDestinations] = useState<DestinationItem[]>(DEFAULT_DESTINATIONS);
  const [travelPackages, setTravelPackages] = useState<TravelPackageItem[]>(DEFAULT_TRAVEL_PACKAGES);
  const [specialOffers, setSpecialOffers] = useState<SpecialOfferItem[]>(DEFAULT_SPECIAL_OFFERS);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(DEFAULT_TESTIMONIALS);
  const [manualFlightOffers, setManualFlightOffers] = useState<ManualFlightOffer[]>(DEFAULT_MANUAL_OFFERS);
  const [hotels, setHotels] = useState<HotelItem[]>(DEFAULT_HOTELS);
  const [faqs, setFaqs] = useState<FaqRecord[]>(DEFAULT_FAQ_RECORDS);
  const [currency, setCurrency] = useState<string>('USD');
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [hasFirestoreCatalog, setHasFirestoreCatalog] = useState(false);

  const hadDocsRef = useRef({
    destinations: false,
    travelPackages: false,
    offers: false,
    testimonials: false,
    faqs: false,
  });

  useEffect(() => {
    const snapshots: Record<string, { data: Partial<AgencySettings>; ts: number; seq: number }> = {};
    let seqCounter = 0;

    const applyLatestSettingsSnapshot = (
      sourceKey: string,
      rawData: Partial<AgencySettings>
    ) => {
      seqCounter += 1;
      snapshots[sourceKey] = {
        data: rawData,
        ts: extractTimestampMs(rawData.updatedAt),
        seq: seqCounter,
      };
      const entries = Object.values(snapshots).sort((a, b) => {
        if (a.ts !== b.ts) return a.ts - b.ts;
        return a.seq - b.seq;
      });
      let merged = DEFAULT_AGENCY_SETTINGS;
      for (const entry of entries) {
        merged = mergeAgencySettings(merged, entry.data);
      }
      setSettings(merged);
      setHasFirestoreCatalog(true);
      if (!hadDocsRef.current.faqs && merged.faqs && merged.faqs.length > 0) {
        setFaqs(
          merged.faqs.map((faq, idx) => ({
            faqId: `faq_settings_${idx + 1}`,
            question: faq.question,
            answer: faq.answer,
            category: 'General',
            order: idx + 1,
            status: 'published',
          }))
        );
      }
    };

    const unsubSiteGeneral = onSnapshot(
      doc(db, 'siteSettings', 'general'),
      (snap) => {
        if (snap.exists()) {
          applyLatestSettingsSnapshot('siteSettings/general', snap.data() as Partial<AgencySettings>);
        }
        setCatalogLoaded(true);
      },
      (err) => {
        console.warn('Site settings read fallback active:', err.message);
        setCatalogLoaded(true);
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'public'),
      (snap) => {
        if (snap.exists()) {
          applyLatestSettingsSnapshot('settings/public', snap.data() as Partial<AgencySettings>);
        }
        setCatalogLoaded(true);
      },
      (err) => {
        console.warn('Public settings read fallback active:', err.message);
        setCatalogLoaded(true);
      }
    );

    const unsubWebSettings = onSnapshot(
      doc(db, 'websiteSettings', 'public'),
      (snap) => {
        if (snap.exists()) {
          applyLatestSettingsSnapshot('websiteSettings/public', snap.data() as Partial<AgencySettings>);
        }
      },
      () => {}
    );

    const unsubDest = onSnapshot(
      collection(db, 'destinations'),
      (snap) => {
        if (!snap.empty) {
          hadDocsRef.current.destinations = true;
          const list = snap.docs
            .map((d) => d.data() as DestinationItem)
            .sort((a, b) => (a.order || 99) - (b.order || 99));
          setDestinations(list);
        } else if (hadDocsRef.current.destinations) {
          setDestinations([]);
        }
      },
      (err) => console.warn('Destinations read fallback:', err.message)
    );

    const unsubPackages = onSnapshot(
      collection(db, 'travelPackages'),
      (snap) => {
        if (!snap.empty) {
          hadDocsRef.current.travelPackages = true;
          setTravelPackages(snap.docs.map((d) => d.data() as TravelPackageItem));
        } else if (hadDocsRef.current.travelPackages) {
          setTravelPackages([]);
        }
      },
      (err) => console.warn('TravelPackages read fallback:', err.message)
    );

    const unsubOffers = onSnapshot(
      collection(db, 'offers'),
      (snap) => {
        if (!snap.empty) {
          hadDocsRef.current.offers = true;
          setSpecialOffers(snap.docs.map((d) => d.data() as SpecialOfferItem));
        } else if (hadDocsRef.current.offers) {
          setSpecialOffers([]);
        }
      },
      (err) => console.warn('Offers read fallback:', err.message)
    );

    const unsubTestimonials = onSnapshot(
      query(collection(db, 'testimonials'), where('status', '==', 'published')),
      (snap) => {
        if (!snap.empty) {
          hadDocsRef.current.testimonials = true;
          setTestimonials(snap.docs.map((d) => d.data() as TestimonialItem));
        } else if (hadDocsRef.current.testimonials) {
          setTestimonials([]);
        }
      },
      (err) => console.warn('Testimonials read fallback:', err.message)
    );

    const unsubManualFlights = onSnapshot(
      collection(db, 'flightOffers'),
      (snap) => {
        setManualFlightOffers(snap.docs.map((d) => d.data() as ManualFlightOffer));
      },
      (err) => console.warn('FlightOffers read fallback:', err.message)
    );

    const unsubHotels = onSnapshot(
      collection(db, 'hotels'),
      (snap) => {
        setHotels(snap.docs.map((d) => d.data() as HotelItem));
      },
      (err) => console.warn('Hotels read fallback:', err.message)
    );

    const unsubFaqs = onSnapshot(
      query(collection(db, 'faqs'), where('status', '==', 'published')),
      (snap) => {
        if (!snap.empty) {
          hadDocsRef.current.faqs = true;
          const list = snap.docs
            .map((d) => d.data() as FaqRecord)
            .sort((a, b) => (a.order || 99) - (b.order || 99));
          setFaqs(list);
        } else if (hadDocsRef.current.faqs) {
          setFaqs([]);
        }
      },
      (err) => console.warn('FAQs read fallback:', err.message)
    );

    return () => {
      unsubSiteGeneral();
      unsubSettings();
      unsubWebSettings();
      unsubDest();
      unsubPackages();
      unsubOffers();
      unsubTestimonials();
      unsubManualFlights();
      unsubHotels();
      unsubFaqs();
    };
  }, []);

  const seedDefaultCatalog = useCallback(async () => {
    try {
      const settingsPayload = buildSanitizedSettingsPayload(DEFAULT_AGENCY_SETTINGS);
      const batch = writeBatch(db);
      batch.set(doc(db, 'siteSettings', 'general'), settingsPayload);
      batch.set(doc(db, 'settings', 'public'), settingsPayload);
      batch.set(doc(db, 'websiteSettings', 'public'), settingsPayload);
      DEFAULT_DESTINATIONS.forEach((d) => {
        batch.set(doc(db, 'destinations', d.destinationId), {
          ...d,
          updatedAt: serverTimestamp(),
        });
      });
      DEFAULT_TRAVEL_PACKAGES.forEach((pkg) => {
        batch.set(doc(db, 'travelPackages', pkg.packageId), {
          ...pkg,
          updatedAt: serverTimestamp(),
        });
      });
      DEFAULT_SPECIAL_OFFERS.forEach((o) => {
        batch.set(doc(db, 'offers', o.offerId), {
          ...o,
          updatedAt: serverTimestamp(),
        });
      });
      DEFAULT_TESTIMONIALS.forEach((t) => {
        batch.set(doc(db, 'testimonials', t.testimonialId), {
          ...t,
          updatedAt: serverTimestamp(),
        });
      });
      DEFAULT_FAQ_RECORDS.forEach((faq) => {
        batch.set(doc(db, 'faqs', faq.faqId), {
          ...faq,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setHasFirestoreCatalog(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'siteSettings/general');
    }
  }, []);

  return (
    <AgencyContext.Provider
      value={{
        settings,
        destinations,
        travelPackages,
        specialOffers,
        testimonials,
        manualFlightOffers,
        hotels,
        faqs,
        currency,
        setCurrency,
        catalogLoaded,
        hasFirestoreCatalog,
        seedDefaultCatalog,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  const ctx = useContext(AgencyContext);
  if (!ctx) throw new Error('useAgency must be used within AgencyProvider');
  return ctx;
}
