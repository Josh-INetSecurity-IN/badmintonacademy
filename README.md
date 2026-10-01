# Badminton Academy Management System

A full-stack web application to run a badminton academy: coaching batches, regular-play memberships, court bookings (guest + scheduled), fee invoicing & payments, subscriptions, attendance, sales & inventory, expenses, tournaments, website content management, WhatsApp reminders and rich analytics.

## Tech Stack

| Layer     | Technology                                                         |
| --------- | ------------------------------------------------------------------ |
| Backend   | Node.js, Express, Prisma ORM, MySQL 8+, TypeScript                 |
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, Recharts, React Hook Form/Zod, Lucide |
| Auth      | JWT (access token), bcrypt password hashing, role-based access     |
| Extras    | Multer (uploads), Helmet, express-rate-limit, pino logging, CSV export |

## Repository Layout

```
badminton-academy/
├── backend/          # Express API + Prisma schema + seed script
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── config/   # env config
│       ├── controllers/  routes/   middleware/   utils/
│       └── app.ts, server.ts
├── frontend/         # React + Vite SPA
│   └── src/
│       ├── components/ui/    # shadcn-style UI kit
│       ├── features/auth/    # AuthProvider, useAuth, guards
│       ├── layouts/          # AdminLayout
│       ├── pages/            # admin/, auth/, public/
│       ├── services/         # typed API clients
│       ├── types/  utils/  lib/
│       └── App.tsx
└── package.json      # root scripts (dev/build/start/db:*)
```

## Prerequisites

- **Node.js 18+**
- **MySQL 8+** (running locally or remote)
- npm (comes with Node)

## 1. Backend Setup

```bash
cd backend
npm install

# Create the environment file from the template
cp .env.example .env
# then edit .env:
#   DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/badminton_academy"
#   JWT_SECRET=<a long random string>
```

Create the database and apply the Prisma schema:

```bash
npm run db:migrate     # prisma migrate dev  (creates tables)
npm run db:seed        # inserts demo users, settings, batches, players, etc.
```

> `npm run db:seed` is safe to re-run (upserts); `npm run db:reset` drops + recreates + reseeds.

Start the API (http://localhost:5000):

```bash
npm run dev
```

API base URL: `http://localhost:5000/api` — health check at `http://localhost:5000/api/health`.

## 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173 (proxies /api and /uploads to :5000)
```

Production build + preview (build output in `frontend/dist`):

```bash
npm run build
```

## 3. Run Everything From the Root

```bash
npm install             # installs root + backend + frontend deps (postinstall)
npm run dev             # starts backend AND frontend concurrently
npm run build           # production build of frontend + backend (backend output in backend/dist)
npm start               # starts the compiled backend (serves API; static uploads)
```

## 4. Default Login Credentials

| Role        | Email                 | Password      |
| ----------- | --------------------- | ------------- |
| Super Admin | `superadmin@academy.com` | `ChangeMe@123` |
| Manager     | `manager@academy.com` | `ChangeMe@123` |
| Staff       | `staff@academy.com`   | `ChangeMe@123` |

**Change these passwords immediately after first login.**

Role permissions:

- **Super Admin** – everything: users, settings, all modules, absolute access.
- **Manager** – all business modules (students, batches, payments, sales, expenses, tournaments, content) except user management and settings.
- **Staff** – day-to-day ops: attendance, guest bookings, sales, enquiries, notifications.

## 5. Feature Overview

- **Students & Coaching Batches** – student CRUD, batch creation with weekly schedule (days + time), capacity & status, enroll/remove students, roster export (CSV), batch calendar, WhatsApp reminders.
- **Regular Play** – regular player memberships, regular batches (weekly slots), monthly subscription billing with duplicate-safe fee generation, overdue/pause/cancel lifecycle.
- **Courts & Bookings** – court management, court timetable (coaching/regular/guest/maintenance slots), double-booking prevention, guest booking calendar.
- **Fees & Payments** – invoice generation per billing month (dedup on billingMonth + member), payments with modes (cash/UPI/card), receipts, payment history, CSV export.
- **Attendance** – mark attendance for coaching batches and regular sessions.
- **Shop** – product/inventory with low-stock thresholds, sales with cart-like item entry.
- **Expenses** – manual expense tracking by category + month.
- **Tournaments** – tournament management with registration, categories, entry fees, public listing + registration form.
- **Website Content** – hero slides (with image upload), programs, facilities, gallery, testimonials, contact enquiries, Google Maps embed.
- **Reports** – monthly revenue (fees + sales), overdue dues, attendance summary, sales by product, expenses vs income.
- **Public Landing Page** – academy info, coaching programs, active batches, upcoming tournaments, gallery, contact/enquiry form.
- **Notifications** – in-app notifications for fee dues, expiring subscriptions, low stock.

## 6. GitHub-Style Branch/Folder Conventions (for the team)

- Feature work: new branch per module; run `npm run db:migrate` only after reviewing `prisma/migrations`.
- Money columns are `DECIMAL(10,2)`; JSON fields (`daysOfWeek`, `categories`, etc.) are stored as JSON strings and parsed server-side.
- API responses follow the envelope `{ success, message, data }`.
- Frontend services live in `frontend/src/services/*` and unwrap `data`; keep page files under `frontend/src/pages/admin/`.

## 7. Deployment Notes

### VPS / Shared Hosting (Node)

1. `npm run build` (produces `frontend/dist` + `backend/dist`).
2. Upload `backend/` (with `backend/.env`, `backend/prisma` migrations, `backend/uploads` writable) and the built `frontend/dist`.
3. Run `cd backend && npx prisma migrate deploy` then `npm start`.
4. Serve `frontend/dist` with Apache/Nginx (or a static host), and proxy `/api` and `/uploads` to the Node process.
5. Example Nginx snippet:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:5000;
  proxy_set_header Host $host;
}
location /uploads/ {
  proxy_pass http://127.0.0.1:5000;
}
```

### cPanel

1. Run the build locally, then upload `frontend/dist` contents to `public_html`.
2. Upload `backend/` outside the web root (e.g. `~/backend`) and run the Node app via Node.js App Manager or a PM2 process.
3. Set `FRONTEND_URL` to your domain and ensure `JWT_SECRET` and `DATABASE_URL` point to your MySQL DB created from the migration files.

## 8. Environment Variables (backend/.env)

| Variable          | Description                          | Default                     |
| ----------------- | ------------------------------------ | --------------------------- |
| `PORT`            | API port                             | `5000`                      |
| `NODE_ENV`        | environment                          | `development`               |
| `DATABASE_URL`    | Prisma MySQL connection string       | `mysql://root:password@localhost:3306/badminton_academy` |
| `JWT_SECRET`      | signing secret (change in prod)      | —                           |
| `JWT_EXPIRES_IN`  | token lifetime                       | `7d`                        |
| `FRONTEND_URL`    | allowed CORS origin                  | `http://localhost:5173`     |
| `UPLOAD_DIR`      | upload folder                        | `./uploads`                 |
| `MAX_FILE_SIZE`   | max upload bytes                     | `5242880`                   |
| `DEFAULT_CURRENCY`| display currency                     | `INR`                       |
| `DEFAULT_TIMEZONE`| logging/report timezone              | `Asia/Kolkata`              |

## 9. Useful Scripts

```bash
# Backend
cd backend && npm run lint          # tsc --noEmit
cd backend && npm run build         # tsc  -> backend/dist
cd backend && npm run check:seed    # typecheck prisma/seed.ts

# Frontend
cd frontend && npm run lint         # tsc -b
cd frontend && npm run build        # tsc -b && vite build
```