# The King Travel — Architecture, Firebase & API Deployment Guide

## 1. Folder Structure
- `src/` — React 19 + TypeScript + Tailwind CSS frontend
  - `components/` — Reusable UI (`Navbar`, `Footer`, `FlightSearchWidget`, `BrandLogo`, `WhatsAppButton`, `admin/*`)
  - `context/` — `AuthContext`, `AgencyContext`, `ToastContext`
  - `lib/` — Firebase initialization (`firebase.ts`), default configurable catalog (`defaultData.ts`), PDF/CSV exporter (`pdfGenerator.ts`)
  - `pages/` — Public pages, multi-step `BookingFlowPage`, `CustomerDashboardPage`, protected `AdminDashboardPage` (`/admin`)
- `server/` — Express backend & supplier abstraction layer
  - `suppliers/` — `AmadeusSupplierProvider`, `DuffelSupplierProvider`, `DemoSupplierProvider`, `supplierRouter.ts`
  - `payments/` — Server-side checkout session & HMAC webhook verification (`paymentVerifier.ts`)
  - `notifications/` — Resend Email & Meta WhatsApp Business Cloud API dispatcher (`notificationDispatcher.ts`)
  - `airports.ts` — Airport & city autocomplete dataset
- `firestore.rules` & `storage.rules` — Zero-Trust security rules
- `firebase-blueprint.json` — Firestore entity & path blueprint

## 2. Firebase Configuration
1. **Authentication Providers**:
   - **Google Sign-In** is active and ready.
   - To also enable **Email/Password** login, open Firebase Console -> Authentication -> Sign-in method -> Enable **Email/Password**.
2. **Firestore Database & Security Rules**:
   - Rules are defined in `firestore.rules` and enforce strict owner/admin isolation, server timestamps, and schema validation.
   - The bootstrapped super-admin account email is `hasanaamir815@gmail.com`. Super admins can assign additional admins from `/admin` -> **Reports & Audit**.
3. **Storage Rules**:
   - `storage.rules` restricts Payment Receipts (`payment-receipts/{userId}/...`), E-Tickets (`e-tickets/{userId}/...`), and Customer Documents (`customer-documents/{userId}/...`) to the owning user and verified administrators.

## 3. Flight Supplier API Integration (Live Mode)
Configure these server-side environment variables (never in `VITE_*` frontend variables):
- **Amadeus Self-Service APIs**: `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_BASE_URL`
- **Duffel API**: `DUFFEL_ACCESS_TOKEN`, `DUFFEL_BASE_URL`
Then switch the platform from **Demo Mode** to **Live Mode** in `/admin` -> **Overview**.

## 4. Payment & Notification Integrations
- **Stripe / PayFast**: Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_WEBHOOK_SECRET`.
- **Email (Resend)**: Set `RESEND_API_KEY` and `EMAIL_FROM`.
- **WhatsApp Business Cloud API**: Set `WHATSAPP_CLOUD_API_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.

## 5. Build & Deployment
```bash
npm install
npm run build
npm run start
```
For Firebase Hosting or Netlify with full-stack Express routes, deploy the Express server (`server.ts`) on Cloud Run / Node host and point `/api/*`, `/sitemap.xml`, and `/robots.txt` rewrites to it.

## 6. GitHub Pages Deployment
1. Push your repository to `main` (or `master`).
2. Open your GitHub repository **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
   - Do **not** select *Deploy from a branch (`/`)* on the source repository, because browsers cannot run unbuilt `.tsx` files directly.
   - The included `.github/workflows/deploy.yml` workflow builds `dist/` automatically and deploys it with relative `./assets/` paths and `HashRouter`.
3. In Firebase Console (**Authentication → Settings → Authorized domains**), add `<your-username>.github.io` (and any custom domain) so Google Sign-In works on the deployed URL.

