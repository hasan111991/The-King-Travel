# The King Travel — Architecture, Netlify, GitHub Pages & Firebase Deployment Guide

## 1. Project Architecture
- `src/` — React 19 + TypeScript + Vite 8 + Tailwind CSS v4 frontend
  - `components/` — Reusable UI (`Navbar`, `Footer`, `FlightSearchWidget`, `FlightBookingRequestForm`, `BrandLogo`, `WhatsAppButton`, `admin/*`)
  - `context/` — `AuthContext`, `AgencyContext`, `ToastContext`
  - `lib/` — Firebase initialization (`firebase.ts`), default catalog (`defaultData.ts`), demo admin sandbox (`demoAdminData.ts`), PDF/CSV exporter (`pdfGenerator.ts`)
  - `pages/` — Public pages, `FlightRequestPage`, `BookingFlowPage`, `CustomerDashboardPage`, protected `AdminDashboardPage` (`/admin`)
- `netlify.toml` & `netlify/functions/api.ts` — Netlify production build, SPA routing fallback (`/* -> /index.html 200`), security/caching headers, and serverless `/api/*` proxy
- `server.ts` & `server/` — Local Express + Vite dev server and shared TypeScript backend modules (`suppliers/`, `payments/`, `notifications/`, `airports.ts`)
- `firestore.rules`, `storage.rules`, `firebase-blueprint.json` — Zero-Trust Firebase security rules and schema blueprint

---

## 2. Netlify Production Deployment
1. **Connect Repository**:
   - In Netlify (`app.netlify.com`), click **Add new site -> Import an existing project** and select `hasan111991/The-King-Travel`.
2. **Build Settings** (auto-detected from `netlify.toml`):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
   - **Node version**: `22`
3. **Netlify Environment Variables** (`Site configuration -> Environment variables`):
   - Optional build variables (already defaulted in `netlify.toml`):
     - `VITE_BASE_PATH`: `/`
     - `VITE_HASH_ROUTER`: `false`
   - Optional server-side secrets (never prefixed with `VITE_`; site builds cleanly even when omitted):
     - `APP_URL` (e.g., `https://www.thekingtravel.com`)
     - `AGENCY_EMAIL` (e.g., `thekingtravel22@gmail.com`)
     - `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_BASE_URL`
     - `DUFFEL_ACCESS_TOKEN`, `DUFFEL_BASE_URL`
     - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
     - `PAYFAST_PK_MERCHANT_ID`, `PAYFAST_PK_SECURED_KEY`, `PAYMENT_WEBHOOK_SECRET`
     - `RESEND_API_KEY`, `EMAIL_FROM`
     - `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`

---

## 3. Custom Domain & DNS Configuration (Netlify)
1. In Netlify: **Domain management -> Add a domain** -> enter `thekingtravel.com` (and `www.thekingtravel.com`).
2. **Option A — Netlify DNS (Recommended)**:
   - Point your domain registrar's nameservers to the 4 Netlify DNS nameservers shown in Netlify Domain Management. Netlify automatically provisions HTTPS (Let's Encrypt) and apex/www redirects.
3. **Option B — External DNS (Cloudflare / GoDaddy / Namecheap)**:
   - Apex (`@` / `thekingtravel.com`): **ALIAS / ANAME** (or **CNAME Flattening**) to `<your-site-name>.netlify.app` — or **A record** pointing to Netlify Load Balancer `75.2.60.5`.
   - `www` subdomain: **CNAME** record pointing to `<your-site-name>.netlify.app`.
   - Wait for DNS propagation and click **Verify DNS configuration -> Provision certificate** in Netlify HTTPS settings.

---

## 4. Firebase Configuration & Deployment
- **Firebase Project ID**: `primeval-objective-t8chg`
- **Firestore Database ID**: `ai-studio-ed91d39c-7cb9-4df1-9e3f-77455f850071`
1. **Authorized Domains (CRITICAL for Netlify Login)**:
   - Open Firebase Console -> **Authentication -> Settings -> Authorized domains**.
   - Add your Netlify subdomain (`<your-site-name>.netlify.app`) AND your custom domains (`thekingtravel.com`, `www.thekingtravel.com`).
2. **Authentication Providers**:
   - **Google Sign-In** is enabled.
   - To enable customer/admin **Email/Password** sign-in in Firebase Console, open **Authentication -> Sign-in method -> Enable Email/Password**.
3. **Admin Access (`/admin`)**:
   - **Live Super Admin**: `hasanaamir815@gmail.com` (verified Google/Firebase session). Additional verified admins can be assigned from `/admin -> Reports & Audit`.
   - **Demo Admin Sandbox** (evaluation mode, does not alter live Firestore):
     - Email: `admin@thekingtravel.com`
     - Password: `KingTravel@2026`
4. **Deploy Security Rules & Storage Rules separately via Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use primeval-objective-t8chg
   firebase deploy --only firestore:rules,storage
   ```
   *(Note: Deploying to Netlify deploys the frontend + `netlify/functions/api.ts`, NOT Firebase rules or Firebase Cloud Functions — deploy Firebase rules/functions separately with Firebase CLI.)*
