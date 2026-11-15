# João Vargas Tours – Design plan (draft for approval)

Status: proposal. No code written yet. Languages: English (default at `/`) and pt-PT.

## 1. Brand direction
- Personal, trustworthy, local. A Calheta taxi driver offering private tours and transfers,
  so the driver himself is the brand: friendly, direct, "book with João".
- Look: clean, airy, lots of white, light blue as the supporting colour, big Madeira photography.
- Assets seen so far: aerial hero of Seixal (north coast), portrait of João on white background,
  the yellow taxi with a light-blue stripe (Calheta, taxi no. 0724), a guest message screenshot.

## 2. Colour tokens (Tailwind theme)
Light blue alone does not give enough contrast for text or buttons (WCAG 2.1 AA), so the light
blue is used for surfaces and a deeper blue for text, links and buttons.

| Token | Value | Use |
|---|---|---|
| `--white` | `#FFFFFF` | page background, cards |
| `--sky-50` | `#F3F9FD` | alternating section background |
| `--sky-100` | `#DCEEFA` | cards, chips, form fields background |
| `--sky-300` | `#9FD0F0` | borders, decorative shapes, icons |
| `--blue-600` | `#1F6FB2` | buttons, links (white text passes AA) |
| `--blue-800` | `#14487A` | headings, footer background |
| `--ink` | `#0F2233` | body text |
| `--sun-400` | `#F5B800` | optional tiny accent (taxi yellow): badges, stars |

Rule: white text only on `--blue-600` or darker. Dark mode is not planned for v1.

## 3. Typography
- Headings: Poppins or Montserrat (friendly, geometric). Body: Inter. Loaded with `next/font`
  (self-hosted, no Google request at runtime, good for privacy and performance).
- Scale: 16 px body, 1.6 line height, fluid headings with `clamp()`.

## 4. Layout and components
- Mobile first (most tourists browse and book from a phone). Max content width 1200 px.
- Header: logo, nav (Tours, Transfers, About, Info, Contact), language switch EN | PT, and a
  "Request booking" button. On mobile: sticky bottom bar with "Request booking" and a WhatsApp button.
- Footer: contacts, WhatsApp, email, links to privacy, terms, cookies, complaints book,
  RNAAT / licence numbers (placeholders until provided).
- Components: `Hero`, `ServiceCard`, `ServiceGrid`, `Highlights`, `AboutDriver`, `Testimonials`,
  `FAQ` (accordion), `BookingForm`, `WhatsAppButton`, `LanguageSwitch`, `Footer`, `Section`.

## 5. Pages
1. **Home:** full-width hero (Seixal photo) with headline and two CTAs ("Request a booking",
   "See tours"); featured tours; transfers strip (airport, hotels); "Meet João" with the portrait;
   why choose us (private, local, flexible, taxi licensed); testimonials; final CTA.
2. **Tours / Transfers:** card grids; detail page per service with gallery, itinerary, includes,
   duration, price "from", and a booking CTA that prefills the form.
3. **About João:** story and photos with the taxi.
4. **Info / FAQ:** weather, what to bring, cancellation, luggage, children, payment on the day.
5. **Contact:** phone, WhatsApp, email, map of Calheta, response time.
6. **Book:** request form. **Thank-you:** reference number and WhatsApp fallback button.
7. **Legal:** privacy, terms, cookies, complaints book.

## 6. Booking form (UX)
- One page, short: service (preselected when coming from a service page), date, time (optional),
  adults / children / infants, pickup and drop-off (transfers), flight number (transfers),
  name, email, phone, notes, privacy checkbox.
- Inline validation with messages in the active language; large touch targets; labels always visible.
- Wording makes clear it is a **request**, not a confirmed booking, and that João replies
  by WhatsApp or email. No payment in v1.
- Hidden honeypot field and idempotency key (see architecture plan).

## 7. Imagery
- `media/images/hero/hero.webp` (4954 x 3300): good hero. Export a 2400 px version for the site.
- `media/images/joao.jpeg`: white background fits the theme; use for the About block (cut-out
  or soft light-blue shape behind).
- `media/images/transfers/*`: taxi photos for transfers and the About page. Review all 8 and pick
  the best 4 to 5; avoid ones with legible third-party faces or licence plates of other cars.
- `media/images/tours/review.jpg` is a screenshot of a guest's message that shows the guests' faces.
  Do not publish as is. Better: retype the quote as text with the guest's first name, and only with
  their permission.
- Next.js image optimisation handles AVIF/WebP, so keep originals in `media/` and copy only the
  selected, resized files into `public/images/`. Alt text in both languages.
- Still needed: logo (or a simple wordmark "João Vargas Tours" until there is one), and photos of
  the actual tour destinations (Cabo Girão, Fanal, Porto Moniz, Pico do Arieiro, etc.).

## 8. Content tone
- English: warm and simple ("Private tours and transfers in Madeira with a local driver").
- pt-PT: not Brazilian ("reservar", "telemóvel", "contactos", "pedido de reserva").
- Provisional copy is marked `TODO` until Pedro and João supply real text.

## 9. Accessibility and performance
- WCAG 2.1 AA: contrast per the tokens, visible focus states, keyboard-friendly accordion and form,
  `lang` attribute per page, alt text.
- Lighthouse 90+ on mobile: hero image `priority` with explicit sizes, fonts via `next/font`,
  no heavy client JS on content pages.

## 10. Next steps once approved
1. Scaffold the app (frontend-dev + backend-dev), with this theme in `tailwind.config` and `config/site.js`.
2. Build the home page and the booking form first; wire the API afterwards.
3. Replace placeholder copy as content arrives.
