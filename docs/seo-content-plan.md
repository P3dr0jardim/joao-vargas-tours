# SEO and content plan (condensed, proposal pending Pedro's approval)

Goal: maximum organic traffic. Keywords below are hypotheses, not measured data: verify
volume and competition ([V]) with a keyword tool / Search Console before finalising pages.

## Keyword clusters (EN first, then pt-PT with native phrasing, not translations)
A airport transfers (Funchal airport transfer, airport to Calheta / Ponta do Sol / Porto Moniz) ·
B taxi vs bus / price guides · C local taxi pages (Calheta, Ponta do Sol, Jardim do Mar, Paul do Mar) ·
D private full-day tours (west / north / east) · E attraction-led tours (Cabo Girao, Fanal, Pico do Arieiro,
Porto Moniz pools, Seixal, Camara de Lobos wine) · F levada walks with transfer ·
G planning guides (best time, where to stay west Madeira) · H trust/comparison (Uber/Bolt in Madeira, reviews).
Strategy: marketplaces dominate generic queries, so aim for long-tail "Calheta / west Madeira" first.

## Architecture
- en at `/`, pt-PT at `/pt`. Localised slugs per locale (stable; renames need 301s).
- Hub and spoke: Transfers hub -> route pages; Tours hub -> tour pages; Places (/taxi/calheta);
  Guide hub (/madeira-guide) -> articles. Breadcrumbs everywhere, no orphan pages, related links
  generated from data.
- Launch size: 5-8 tours, 5-6 transfer routes, 2-3 place pages, 12 guide articles in 90 days.
  A route page needs 400-600 words of route-specific text and an original photo, otherwise
  merge it into the hub (no thin/duplicate pages).

## 90-day content order
1. Weeks 1-3 (money pages, EN + pt-PT): home, airport transfers hub, routes (Calheta, Ponta do Sol,
   Funchal, Porto Moniz), Calheta taxi, west tour, north/Porto Moniz tour, tours hub, About Joao, FAQ.
2. Weeks 4-8: guides for Cabo Girao, Fanal, Porto Moniz pools, Pico do Arieiro, Seixal; east tour;
   levada transfers; Camara de Lobos wine; taxi vs bus vs rental car; where to stay in west Madeira.
3. Weeks 9-13: best time to visit, things to do in Calheta, Paul da Serra, one day in west Madeira,
   is a private driver worth it, driving in Madeira, Ponta do Sol / Jardim do Mar, food.
Rules: no bulk AI or duplicated content; every page needs facts Joao verifies and at least one
"only a local knows" detail. Guide authored as MDX in the repo (needs dependency approval).

## Technical SEO (Next.js App Router)
generateMetadata per page (unique title ~55-60, description ~150), canonical + hreflang (en, pt-PT,
x-default, reciprocal), static generation (ISR once on MongoDB), sitemap with real lastModified,
robots (disallow /api, thank-you, admin), JSON-LD (TaxiService/TravelAgency, TouristTrip + Offer,
Service, BreadcrumbList, Article, FAQPage low value) built from one helper, dynamic OG images,
Core Web Vitals (LCP < 2.5 s, INP < 200 ms, CLS < 0.1), next/image AVIF/WebP with sizes and bilingual
alt, next/font, custom 404, redirects file, noindex on thank-you / previews, no forced locale redirect
for crawlers, security headers.
Do NOT add star-rating markup for the business's own reviews (not eligible); show reviews as text.

## Local SEO and off-site
Google Business Profile (Taxi service + Tour operator, service-area business, real name only),
consistent NAP (+351 format), steady real Google reviews (no incentives, no gating), TripAdvisor,
hotel/guesthouse partnerships and backlinks, optional GetYourGuide/Viator (commission, rate parity).
Maps embed on Contact only, click-to-load.

## Measurement
Search Console (+ Bing Webmaster), cookieless analytics (Plausible recommended, Vercel Web Analytics as a
free start), events: booking_submit, whatsapp_click, phone_click, email_click, outbound review click;
no personal data in events. Monthly ~1 hour review routine.

## Legal / trust (to confirm with Joao or an advisor)
Taxi licence + vehicle info, RNAAT and tourism insurance (confirm applicability), Livro de
Reclamacoes + RAL link, privacy/RGPD, terms (request is not a confirmed booking), regulated taxi
fares, avoid "licensed guide" wording unless he holds the credential, no unproven "best / #1" claims.

## Data model additions (content/services.js, later MongoDB)
slug{en,pt}, seo{title,description,keyword,ogImage}, body, duration, distanceKm, driveTime, priceFrom,
capacity, route{from,to,via}, itinerary[], includes/excludes, faq[], gallery[] with bilingual alt,
related{services,guide}, updatedAt. Also content/places.js, content/reviews.js (with consent + source),
content/redirects.js, content/guide/{en,pt}/*.mdx.

## Open questions
Which tours/routes and prices does Joao really offer, and vehicle capacity? RNAAT / insurance / guide
credential? Original photos and videos? Other languages he speaks (German next, French later, from
about month 4-6)? Final domain? Plausible (~9 EUR/month) and MDX approved? Marketplaces wanted?
Who reviews pt-PT?
