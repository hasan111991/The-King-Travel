import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  DEFAULT_MANUAL_OFFERS,
  DEFAULT_SPECIAL_OFFERS,
  DEFAULT_TESTIMONIALS,
  DEFAULT_TRAVEL_PACKAGES,
} from '../lib/defaultData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AgencySettings,
  DestinationItem,
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
  currency: string;
  setCurrency: (curr: string) => void;
  catalogLoaded: boolean;
  hasFirestoreCatalog: boolean;
  seedDefaultCatalog: () => Promise<void>;
}

const AgencyContext = createContext<AgencyContextValue | null>(null);

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_AGENCY_SETTINGS);
  const [destinations, setDestinations] = useState<DestinationItem[]>(DEFAULT_DESTINATIONS);
  const [travelPackages, setTravelPackages] = useState<TravelPackageItem[]>(DEFAULT_TRAVEL_PACKAGES);
  const [specialOffers, setSpecialOffers] = useState<SpecialOfferItem[]>(DEFAULT_SPECIAL_OFFERS);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(DEFAULT_TESTIMONIALS);
  const [manualFlightOffers, setManualFlightOffers] = useState<ManualFlightOffer[]>(DEFAULT_MANUAL_OFFERS);
  const [currency, setCurrency] = useState<string>('USD');
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [hasFirestoreCatalog, setHasFirestoreCatalog] = useState(false);

  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'public'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AgencySettings;
          setSettings((prev) => ({ ...DEFAULT_AGENCY_SETTINGS, ...prev, ...data }));
          setHasFirestoreCatalog(true);
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
          const data = snap.data() as AgencySettings;
          setSettings((prev) => ({ ...DEFAULT_AGENCY_SETTINGS, ...prev, ...data }));
          setHasFirestoreCatalog(true);
        }
      },
      () => {}
    );

    const unsubDest = onSnapshot(
      collection(db, 'destinations'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => d.data() as DestinationItem)
            .sort((a, b) => (a.order || 99) - (b.order || 99));
          setDestinations(list);
        }
      },
      (err) => console.warn('Destinations read fallback:', err.message)
    );

    const unsubPackages = onSnapshot(
      collection(db, 'travelPackages'),
      (snap) => {
        if (!snap.empty) {
          setTravelPackages(snap.docs.map((d) => d.data() as TravelPackageItem));
        }
      },
      (err) => console.warn('TravelPackages read fallback:', err.message)
    );

    const unsubOffers = onSnapshot(
      collection(db, 'offers'),
      (snap) => {
        if (!snap.empty) {
          setSpecialOffers(snap.docs.map((d) => d.data() as SpecialOfferItem));
        }
      },
      (err) => console.warn('Offers read fallback:', err.message)
    );

    const unsubTestimonials = onSnapshot(
      query(collection(db, 'testimonials'), where('status', '==', 'published')),
      (snap) => {
        if (!snap.empty) {
          setTestimonials(snap.docs.map((d) => d.data() as TestimonialItem));
        }
      },
      (err) => console.warn('Testimonials read fallback:', err.message)
    );

    const unsubManualFlights = onSnapshot(
      collection(db, 'flightOffers'),
      (snap) => {
        if (!snap.empty) {
          setManualFlightOffers(snap.docs.map((d) => d.data() as ManualFlightOffer));
        }
      },
      (err) => console.warn('FlightOffers read fallback:', err.message)
    );

    return () => {
      unsubSettings();
      unsubWebSettings();
      unsubDest();
      unsubPackages();
      unsubOffers();
      unsubTestimonials();
      unsubManualFlights();
    };
  }, []);

  const seedDefaultCatalog = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'settings', 'public'), {
        ...DEFAULT_AGENCY_SETTINGS,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'websiteSettings', 'public'), {
        ...DEFAULT_AGENCY_SETTINGS,
        updatedAt: serverTimestamp(),
      });
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
      DEFAULT_MANUAL_OFFERS.forEach((f) => {
        batch.set(doc(db, 'flightOffers', f.offerId), {
          ...f,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setHasFirestoreCatalog(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/public');
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
