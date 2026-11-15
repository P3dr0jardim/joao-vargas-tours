# Project history (summary of the planning and build conversation)

This is a curated summary of the decisions and work done with Claude Code, not a raw
transcript. Kept in the repo so the context is not lost. Dates: November 2026.

## Brief (from Pedro)
Website for "João Vargas Tours": private tours and transfers in Madeira. Present services, info
and contacts; visitors fill a booking REQUEST (no payment for now); each request must reach the
driver by WhatsApp and by email. Next.js + Node, hosted on Vercel. Goal: attract as many
customers as possible organically (excellent SEO, a lot of real content).

## Decisions made
- Brand: João Vargas Tours. Languages: English (default at `/`) and pt-PT (`/pt`). Colours: white and light blue.
- Driver phone/WhatsApp: +351 966 167 435. Taxi from Calheta.
- No separate Express server: Next.js Route Handlers (serverless) on Vercel. App Router, plain JavaScript.
- Approved packages: next-intl, zod (plus mongoose, react-hook-form, date-fns, Tailwind, Vitest already used in sibling projects).
- Email: Resend over fetch. WhatsApp: Cloud API over fetch, off by default until the Meta template is approved.
- MongoDB only as a booking log (not a gate); services live in `content/services.js` for now.
- Admin menu (edit photos/services/prices): later, once MongoDB is ready (needs auth + image storage decisions).
- Services currently use FICTITIOUS placeholder values (flag `placeholder: true`); to be replaced by João's real data.
  Service ideas came from generic service types only; no wording or images were copied from any competitor.
- Site stays non-indexable until `SITE_INDEXING=on` is set (at launch, production only).

## Work done (branches feat/scaffold -> feat/services -> feat/booking)
1. Architecture plan, design plan (`docs/design-plan.md`), SEO and content plan (`docs/seo-content-plan.md`).
2. Scaffold + i18n + layout + home page (hero with João's driver card).
3. 11 placeholder services with listing and detail pages, sitemap, robots, indexing switch.
4. Booking API (`POST /api/booking-requests`), email and WhatsApp channels, rate limiter, model.
5. Booking form UI and thank-you page.
6. Tester and reviewer passes.

## Update: review and tester findings below were FIXED on branch fix/booking-review
(lint clean, 393 tests green, build OK). Still partly open: cross-instance idempotency lookup runs
before sends (sequential on purpose); late-save follow-up is best effort on serverless (Next `after()`
not added); no alert/retry for `delivery_failed` yet (v1.1); no real browser/screen-reader test;
privacy policy and consent text versions are placeholders; EMAIL_CUSTOMER_COPY_ENABLED must stay off
until captcha/Upstash exist. New contract: honeypot field is `bot_trap_field`; fast fills are stored with
`meta.suspect=true` instead of being discarded; env var ALLOWED_ORIGINS added.

## Review findings (original, now fixed; reviewer verdict was: needs changes)
Blockers:
1. DB save always fails: `serviceSnapshot.title` is a String in the model but the code passes `{pt, en}`
   (`models/BookingRequest.js`, `lib/booking/service.js`). Tests mock the model, so they miss it.
2. Bot detection can drop real bookings with a fake 201 (client clock skew vs server in `formStartedAt`;
   browser autofill can fill the honeypot named `website`).
Should fix before launch: spoofable `x-forwarded-for` for rate limits; keep `EMAIL_CUSTOMER_COPY_ENABLED` off
until captcha/Upstash exist; idempotency race; DB-down latency and missing `maxDuration`; saved-but-undelivered
requests have no alert/retry; missing `NEXT_PUBLIC_SITE_URL` fails every request with 403 silently;
GDPR items (final privacy policy, health data in notes, required IP_HASH_SALT, retention decision);
a11y nits in the error summary and disabled submit button; client/server mismatches (capacity default,
leap day), invisible characters, phone with extra 0 after the country code.

## Tester results (lint, build and 343 tests green, 1 expected fail pinned with `it.fails`)
4 test files added (232 tests). Real HTTP smoke tests against a production build passed (validation,
honeypot, origin, rate limit 429, noindex on thank-you). Extra bugs found (source not changed yet):
1. Client two-year limit wrong on 29 Feb 2028 (`components/booking/booking-helpers.js`, `shift`).
2. Per-email daily quota is consumed even when delivery fails (502), locking a customer out for 24 h
   (`lib/booking/service.js`).
3. Fallback idempotency key is not a UUID (non-secure contexts), so the server rejects the submit
   (`components/booking/BookingForm.js`, `newKey`).
Notes: the form is client-rendered only (no form without JavaScript); `x-forwarded-for` is spoofable; the
real browser flow, screen readers and a real 201 delivery are untested.

## Open questions for Pedro / João
- Email address that receives requests (EMAIL_BOOKINGS_TO); company legal data (name, NIF, RNAAT, licences).
- Real services, prices, capacity (4 or 8 seats?), stops, photos and videos; guide credential wording.
- WhatsApp: the sender number cannot alert itself in coexistence mode. Options: alert a second number,
  email only at launch, or send a confirmation template to the customer.
- Localised slugs for pt-PT (`/pt/passeios`)? MDX guide and Plausible analytics approvals? Domain? Retention period?
- Later: admin area, German locale, Upstash rate limit, Turnstile captcha, payments.
