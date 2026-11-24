# Admin panel (/admin)

Tours and transfers are edited at `/admin`. The panel is Portuguese only and is never indexed.

## How the catalogue works

- Services live in the MongoDB collection `services` (model: `models/Service.js`, same shape as
  `content/services.js`).
- While `MONGODB_URI` is missing, the collection is empty or the database does not answer within
  2.5 s, the public site uses `content/services.js`. The site never goes down with the database.
- Public pages are static. Saving, creating or deleting a service in the panel rebuilds them
  (`revalidatePath`), so changes show at once.
- Only services marked "Publicado" appear on the site.

## First setup

1. Create a MongoDB database (MongoDB Atlas free tier is enough). In Atlas, Network Access must
   allow Vercel (`0.0.0.0/0`, Vercel has no fixed IPs) and the database user needs read/write.
2. Set, in `.env.local` and in Vercel (Production):
   - `MONGODB_URI`
   - `ADMIN_SESSION_SECRET`: random, at least 32 characters
     (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
3. Create the admin account from your computer (uses `MONGODB_URI` from `.env.local`):
   `npm run admin:create -- joao@example.pt` (asks for the password, min. 12 characters).
   Run it again with the same email to change the password; that signs out open sessions.
4. Sign in at `/admin/login`, press "Importar os serviços atuais" once. From then on the database
   is the source and `content/services.js` is only the fallback.

## Security

- Passwords: scrypt with a random salt (`lib/admin/password.js`). No account can be created from
  the web.
- Session: httpOnly, `SameSite=Strict` cookie signed with HMAC-SHA256, valid 12 hours. Every
  request reloads the account, so deleting it or changing the password ends its sessions.
- Login: 10 attempts per 15 minutes per IP and 10 per hour per email (in-memory limiter, see
  `lib/rate-limit.js` for its limits on serverless).
- Writes are accepted only from the site's own origin (`lib/origin.js`).
- Every admin page and API route checks the session itself, not only the layout.

## API

| Method | Path | |
|---|---|---|
| POST | `/api/admin/login` | `{ email, password }`, sets the cookie |
| POST | `/api/admin/logout` | clears the cookie |
| GET / POST | `/api/admin/services` | list / create |
| GET / PUT / DELETE | `/api/admin/services/:id` | read / replace / delete (Mongo `_id`) |
| POST | `/api/admin/services/import` | copy `content/services.js` into an EMPTY collection |

Validation: `lib/admin/service-input.js`. Errors come back as `{ errors: { "title.pt": "required" } }`.
