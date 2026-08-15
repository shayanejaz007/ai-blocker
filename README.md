# Decod3X — AI Content Detection Platform

Detect AI-generated images, deepfakes, and synthetic media with 99.4% accuracy.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS v4
- **Auth:** Supabase Auth (email/password)
- **Database:** Supabase (PostgreSQL with RLS)
- **Payments:** Stripe Checkout
- **AI Backend:** FastAPI (separate service)

## Getting Started

### 1. Clone & Install

```bash
cd decod3x
npm install
```

### 2. Environment Variables

Copy `.env.local.example` or create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Model API
MODEL_API_URL=http://localhost:8000
MODEL_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

1. Go to your Supabase dashboard → SQL Editor
2. Run the contents of `supabase/schema.sql`
3. This creates all tables, RLS policies, and the auto-signup trigger (gives 1 free credit), rate limiting, and atomic credit functions

### 4. Stripe Setup

1. Create 3 products/prices in Stripe Dashboard:
   - **Starter:** $9 one-time → 50 credits
   - **Pro:** $29 one-time → 200 credits
   - **Enterprise:** $79 one-time → 600 credits
2. Copy the price IDs to `.env.local`
3. Set up a webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Events to listen for: `checkout.session.completed`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Model Backend

The FastAPI backend should be running at `MODEL_API_URL` with a `/predict` endpoint.

```bash
cd backend-fastapi-serve/Backed_serve
pip install -r requirements.txt
uvicorn main:app --reload
```

## Project Structure

```
decod3x/
├── app/
│   ├── api/
│   │   ├── auth/logout/route.ts
│   │   ├── predict/route.ts
│   │   └── stripe/
│   │       ├── checkout/route.ts
│   │       └── webhook/route.ts
│   ├── auth/
│   │   ├── callback/route.ts
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── logout-button.tsx
│   ├── pricing/page.tsx
│   ├── upload/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          (landing page)
├── lib/
│   └── supabase-admin.ts
├── utils/supabase/
│   ├── client.ts
│   ├── middleware.ts
│   └── server.ts
├── supabase/
│   └── schema.sql
├── middleware.ts
├── public/
│   └── landing-original.html  (backup of original)
└── backend-fastapi-serve/     (FastAPI model server)
```

## Deployment (Vercel)

```bash
vercel --prod
```

Set all env variables in Vercel dashboard. Update `NEXT_PUBLIC_APP_URL` to your production domain.

## Credits System

- New users get **1 free credit** on signup
- Image scan = 1 credit
- Video scan = 3 credits
- Purchase more via Stripe checkout

## Security Notes

- **Never commit env files.** `vercel.env` was removed from the repo and env files are gitignored. If real keys were ever pushed, **rotate them now** (Supabase service role key, Stripe secret key, webhook secret) and scrub git history (`git filter-repo` or BFG).
- **MODEL_API_KEY is required in production.** Set the same value in both the Next.js env and the FastAPI (Render) env. The FastAPI server now rejects any request without a matching `X-API-Key` header — without this, anyone with the model URL gets free unlimited predictions.
- **Rate limiting** is DB-backed (`public.check_rate_limit` in `supabase/schema.sql`) and works across serverless instances: predict 10/min/user + 30/min/IP, checkout 5/min/user, verify 10/min/user, model-status 30/min/IP. Re-run `supabase/schema.sql` in the SQL Editor to install the new functions/tables.
- **Credit operations are atomic** (`deduct_credits`, `add_credits` RPCs) and payment completion uses conditional updates, so concurrent webhooks/verify calls can no longer double-credit.
- In Supabase Auth settings, also disable the Google provider and set minimum password length to 8 to match the frontend.

## UI & Mobile

The visual theme (dark `#080810` base, `#7c3aed → #a855f7` purple gradient, glassmorphism) is unchanged. What changed is how it holds up outside a desktop browser:

- **Real viewport config** — `viewport` export with `viewportFit: "cover"` and a theme color, so the notch and status bar are handled. Pinch-zoom is deliberately left enabled.
- **Safe areas** — `env(safe-area-inset-*)` drives the `.gutter`, `.pt-safe`, and `.pb-safe` helpers, so content clears notches and the home indicator in both orientations.
- **`svh`/`dvh` heights** — full-height sections no longer get cut off by the iOS Safari toolbar the way `100vh` did.
- **No horizontal scroll** — `overflow-x` guards plus responsive widths on marquees, glow orbs, and testimonial cards (`w-[360px]` → `w-[280px] sm:w-[340px]`).
- **No iOS zoom-on-focus** — all inputs are 16px; anything smaller made Safari zoom the page when a field was tapped.
- **44px touch targets** on coarse pointers, with hover effects gated behind `@media (hover: hover)` so cards don't stick in a hover state after a tap.
- **Section rhythm** — `--section-y` is 72px on phones and 120px from `md` up, replacing hardcoded `py-[120px]` that made mobile pages endless.
- **`prefers-reduced-motion`** respected globally: marquees stop, the matrix canvas doesn't start, reveals show immediately.
- **Keyboard access** — skip link, visible `:focus-visible` rings, real button semantics on the dropzone and stat filters, ARIA on the accordion and mobile menu.

Component-level fixes: the matrix canvas now uses `requestAnimationFrame` with DPR scaling and pauses on tab hide (it was a permanent 20fps timer); the mobile menu locks body scroll and closes on Escape, backdrop tap, or resize; the FAQ accordion animates to real content height instead of clipping at 300px; the upload page's credits badge moved into the navbar (it used to sit on top of the heading on phones); dashboard stats are 2-up on mobile with confidence readings inlined into scan rows rather than hidden.

`lib/supabase-admin.ts` now builds its client lazily — at module scope it crashed `next build` for any route that merely imported it.

## Branding

The mark is a **D/X monogram**: a bold geometric D whose counter conceals an X. It was generated with Higgsfield, then **vectorized by hand** rather than embedded as a bitmap — the SVG stays sharp at every pixel density, inherits the theme gradient, and adds no network request. Proportions are measured from the source artwork: the X's arm weight equals the D's stem width (both 88px in the original), the slope is 0.7, and the X is centered in the counter and clipped to it so the arms cut flush against the stem and the bowl's inner curve.

The original Higgsfield render is kept at `public/brand/logo-dx-source.png` for reference.

**One component for all in-app use.** `components/ui/logo.tsx` is the single source of truth. It replaced four copy-pasted inline copies that each hardcoded a gradient id (`navGrad`, `lGrad`, `sGrad`); since SVG `<defs>` share a document-global namespace, two logos on one page meant the first gradient silently won for both. `useId()` now namespaces every instance.

```tsx
import Logo, { LogoMark } from "@/components/ui/logo";

<Logo />                                    // mark + wordmark, links to /
<Logo size={32} wordmarkClass="text-lg" />  // navbar size
<Logo animated />                           // X arms pulse (auto-off under reduced motion)
<LogoMark size={24} />                      // bare mark, no wordmark, no link
```

**Raster assets** live at the Next.js file-convention paths, so Next emits the tags and cache-busting hashes itself — don't hand-write `<link rel="icon">`:

| File | Purpose |
| --- | --- |
| `app/icon.svg` | Favicon (vector, rounded dark tile) |
| `app/apple-icon.png` | iOS home screen, 180×180 |
| `app/opengraph-image.png` | Link preview card, 1200×630 |
| `app/twitter-image.png` | X/Twitter card |
| `public/brand/logo-mark.svg` | Mark on its dark tile |
| `public/brand/logo-mark-transparent.svg` | Mark on transparency (decks, email) |
| `public/brand/logo-mark-512.png` | 512px PNG for tools that can't take SVG |
| `public/brand/logo-dx-source.png` | Original Higgsfield render |

### Swapping the mark

To change the logo everywhere, edit the two paths in `components/ui/logo.tsx` and `app/icon.svg`. To regenerate the rasters from a different source image:

```bash
npm i -D sharp
node scripts/build-brand-assets.mjs ./path/to/new-logo.png
```

Icons are aggressively cached — hard-refresh and restart `next dev` after changing them.
