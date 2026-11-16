import { serverTimestamp } from 'firebase/firestore';
import { DEFAULT_AGENCY_SETTINGS } from './defaultData';
import type { AgencySettings, FaqItem } from '../types/travel';

function toCleanString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function normalizeFaqs(faqs: unknown): FaqItem[] {
  if (!Array.isArray(faqs)) return DEFAULT_AGENCY_SETTINGS.faqs;
  return faqs
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      question: toCleanString(item.question),
      answer: toCleanString(item.answer),
    }))
    .filter((item) => item.question.length > 0 || item.answer.length > 0)
    .slice(0, 30);
}

export function mergeAgencySettings(
  base: AgencySettings,
  incoming?: Partial<AgencySettings> | null
): AgencySettings {
  const src = incoming || {};
  return {
    agencyName: toCleanString(src.agencyName, base.agencyName) || DEFAULT_AGENCY_SETTINGS.agencyName,
    tagline: src.tagline !== undefined ? toCleanString(src.tagline) : base.tagline,
    logoUrl: src.logoUrl !== undefined ? toCleanString(src.logoUrl) : toCleanString(base.logoUrl),
    heroBannerUrl:
      src.heroBannerUrl !== undefined ? toCleanString(src.heroBannerUrl) : toCleanString(base.heroBannerUrl),
    seoTitle: src.seoTitle !== undefined ? toCleanString(src.seoTitle) : toCleanString(base.seoTitle),
    seoDescription:
      src.seoDescription !== undefined
        ? toCleanString(src.seoDescription)
        : toCleanString(base.seoDescription),
    executiveName:
      src.executiveName !== undefined ? toCleanString(src.executiveName) : toCleanString(base.executiveName),
    executiveRole:
      src.executiveRole !== undefined ? toCleanString(src.executiveRole) : toCleanString(base.executiveRole),
    operatingMode: 'live',
    defaultCurrency: toCleanString(src.defaultCurrency, base.defaultCurrency || 'USD') || 'USD',
    whatsappNumber: src.whatsappNumber !== undefined ? toCleanString(src.whatsappNumber) : base.whatsappNumber,
    contactEmail: src.contactEmail !== undefined ? toCleanString(src.contactEmail) : base.contactEmail,
    contactPhone: src.contactPhone !== undefined ? toCleanString(src.contactPhone) : base.contactPhone,
    secondaryPhone:
      src.secondaryPhone !== undefined ? toCleanString(src.secondaryPhone) : toCleanString(base.secondaryPhone),
    officeAddress: src.officeAddress !== undefined ? toCleanString(src.officeAddress) : base.officeAddress,
    heroTitle: src.heroTitle !== undefined ? toCleanString(src.heroTitle) : base.heroTitle,
    heroSubtitle: src.heroSubtitle !== undefined ? toCleanString(src.heroSubtitle) : base.heroSubtitle,
    footerText: src.footerText !== undefined ? toCleanString(src.footerText) : toCleanString(base.footerText),
    socialLinks: {
      facebook: toCleanString(src.socialLinks?.facebook ?? base.socialLinks?.facebook),
      instagram: toCleanString(src.socialLinks?.instagram ?? base.socialLinks?.instagram),
      youtube: toCleanString(src.socialLinks?.youtube ?? base.socialLinks?.youtube),
      tiktok: toCleanString(src.socialLinks?.tiktok ?? base.socialLinks?.tiktok),
      linkedin: toCleanString(src.socialLinks?.linkedin ?? base.socialLinks?.linkedin),
      x: toCleanString(src.socialLinks?.x ?? base.socialLinks?.x),
    },
    paymentMethods: {
      bankTransfer:
        typeof src.paymentMethods?.bankTransfer === 'boolean'
          ? src.paymentMethods.bankTransfer
          : Boolean(base.paymentMethods?.bankTransfer ?? true),
      jazzCash:
        typeof src.paymentMethods?.jazzCash === 'boolean'
          ? src.paymentMethods.jazzCash
          : Boolean(base.paymentMethods?.jazzCash ?? true),
      easypaisa:
        typeof src.paymentMethods?.easypaisa === 'boolean'
          ? src.paymentMethods.easypaisa
          : Boolean(base.paymentMethods?.easypaisa ?? true),
      cardGateway:
        typeof src.paymentMethods?.cardGateway === 'boolean'
          ? src.paymentMethods.cardGateway
          : Boolean(base.paymentMethods?.cardGateway ?? true),
    },
    bankDetails: {
      bankName: toCleanString(src.bankDetails?.bankName ?? base.bankDetails?.bankName),
      accountTitle: toCleanString(src.bankDetails?.accountTitle ?? base.bankDetails?.accountTitle),
      accountNumber: toCleanString(src.bankDetails?.accountNumber ?? base.bankDetails?.accountNumber),
      iban: toCleanString(src.bankDetails?.iban ?? base.bankDetails?.iban),
      jazzCashNumber: toCleanString(src.bankDetails?.jazzCashNumber ?? base.bankDetails?.jazzCashNumber),
      easypaisaNumber: toCleanString(src.bankDetails?.easypaisaNumber ?? base.bankDetails?.easypaisaNumber),
      instructions: toCleanString(src.bankDetails?.instructions ?? base.bankDetails?.instructions),
    },
    faqs: src.faqs !== undefined ? normalizeFaqs(src.faqs) : normalizeFaqs(base.faqs),
    legalPages: {
      terms: toCleanString(src.legalPages?.terms ?? base.legalPages?.terms),
      privacy: toCleanString(src.legalPages?.privacy ?? base.legalPages?.privacy),
      refundPolicy: toCleanString(src.legalPages?.refundPolicy ?? base.legalPages?.refundPolicy),
      cancellationPolicy: toCleanString(
        src.legalPages?.cancellationPolicy ?? base.legalPages?.cancellationPolicy
      ),
      bookingConditions: toCleanString(
        src.legalPages?.bookingConditions ?? base.legalPages?.bookingConditions
      ),
    },
    updatedAt: src.updatedAt ?? base.updatedAt,
  };
}

export function buildSanitizedSettingsPayload(s: AgencySettings) {
  const clean = mergeAgencySettings(DEFAULT_AGENCY_SETTINGS, s);
  // Strip updatedAt from spread and attach fresh serverTimestamp()
  const { updatedAt: _ignored, ...rest } = clean;
  return {
    ...rest,
    updatedAt: serverTimestamp(),
  };
}

export function validateSettingsForm(s: AgencySettings): string | null {
  const agencyName = toCleanString(s.agencyName);
  if (!agencyName) {
    return 'Website / Agency Name is required.';
  }
  if (agencyName.length > 120) {
    return 'Website / Agency Name must be 120 characters or fewer.';
  }
  if (toCleanString(s.tagline).length > 300) {
    return 'Tagline must be 300 characters or fewer.';
  }
  if (toCleanString(s.logoUrl).length > 1000) {
    return 'Website Logo URL must be 1000 characters or fewer (use an image URL or upload to Firebase Storage).';
  }
  if (toCleanString(s.heroBannerUrl).length > 1000) {
    return 'Hero Banner URL must be 1000 characters or fewer (use an image URL or upload to Firebase Storage).';
  }
  if (toCleanString(s.seoTitle).length > 160) {
    return 'SEO Meta Title must be 160 characters or fewer.';
  }
  if (toCleanString(s.seoDescription).length > 400) {
    return 'SEO Meta Description must be 400 characters or fewer.';
  }
  if (toCleanString(s.heroTitle).length > 200) {
    return 'Hero Headline must be 200 characters or fewer.';
  }
  if (toCleanString(s.heroSubtitle).length > 600) {
    return 'Hero Subtitle must be 600 characters or fewer.';
  }
  if (toCleanString(s.footerText).length > 600) {
    return 'Footer description must be 600 characters or fewer.';
  }
  const email = toCleanString(s.contactEmail);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Contact Email must be a valid email address.';
  }
  if (email.length > 200) {
    return 'Contact Email must be 200 characters or fewer.';
  }
  if (toCleanString(s.officeAddress).length > 300) {
    return 'Office Address must be 300 characters or fewer.';
  }
  const urlFields: Array<[string, string | undefined]> = [
    ['Website Logo URL', s.logoUrl],
    ['Hero Banner URL', s.heroBannerUrl],
    ['Facebook URL', s.socialLinks?.facebook],
    ['YouTube URL', s.socialLinks?.youtube],
    ['Instagram URL', s.socialLinks?.instagram],
    ['TikTok URL', s.socialLinks?.tiktok],
    ['LinkedIn URL', s.socialLinks?.linkedin],
    ['X (Twitter) URL', s.socialLinks?.x],
  ];
  for (const [label, raw] of urlFields) {
    const val = toCleanString(raw);
    if (!val) continue;
    if (!/^(https?:\/\/|\/|\.\/)/i.test(val)) {
      return `${label} must start with https://, http://, or /`;
    }
  }
  return null;
}

export function formatFirebaseSaveError(err: unknown): { code: string; message: string } {
  const anyErr = err as { code?: string; message?: string } | null;
  const code = toCleanString(anyErr?.code);
  const rawMessage = err instanceof Error ? err.message : toCleanString(anyErr?.message, String(err));

  if (code === 'permission-denied' || rawMessage.includes('Missing or insufficient permissions')) {
    return {
      code: 'permission-denied',
      message:
        'Firestore Permission Denied (permission-denied): Ensure you are signed in with an authorized Admin Google account (email verified) and that updated Firestore Security Rules are deployed.',
    };
  }
  if (code === 'unauthenticated') {
    return {
      code: 'unauthenticated',
      message:
        'Authentication Expired (unauthenticated): Please sign out and sign back in with your authorized Google Admin account.',
    };
  }
  if (code === 'invalid-argument' || rawMessage.includes('Unsupported field value')) {
    return {
      code: code || 'invalid-argument',
      message: `Invalid Settings Data (${code || 'invalid-argument'}): ${rawMessage}`,
    };
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return {
      code,
      message: `Firestore Network Error (${code}): Cloud Firestore could not be reached. Please check your connection and try again.`,
    };
  }
  if (code === 'failed-precondition') {
    return {
      code,
      message: `Firestore Configuration Error (failed-precondition): ${rawMessage}`,
    };
  }
  return {
    code: code || 'unknown',
    message: code ? `Firebase Error (${code}): ${rawMessage}` : rawMessage || 'Unable to save CMS settings to Firestore.',
  };
}
