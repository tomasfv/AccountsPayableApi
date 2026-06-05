# Accounts Payable App

A full-stack invoice and payment management application inspired by Ramp and Melio. Enables billing teams to create, approve, schedule, and pay vendor invoices with full PDF attachment support, role-based access control, and a clean dark-themed UI.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS v4, Redux Toolkit, React Router v7, react-hot-toast |
| Backend | Node.js, Express, TypeScript, Sequelize v6, PostgreSQL, Multer |
| Auth | JWT (bcryptjs) |
| PDF | Native `<embed>` viewer, disk storage via multer |

## What It Does

- **Bill lifecycle management** — Create (with PDF upload) → Submit for Approval → Approve/Reject → Edit & Resubmit → Schedule Payment → Pay
- **PDF attachment & viewer** — Upload a PDF when creating a bill; view or download it from the detail modal; edit to replace the file
- **Role-based access** — `Admin` (full control), `Approver` (approve/reject/schedule/pay), `Submitter` (create/edit/submit bills)
- **Card management** — Each user can hold one Debit and one Credit card; card type validation when scheduling payments (ACH needs Debit, Card needs Credit)
- **Payment scheduling** — Schedule payments for future dates, reschedule, cancel, or pay immediately
- **Toast-based UX** — All alerts, confirmations, and errors use react-hot-toast; no `window.confirm` or banner errors

## Prioritized Workflows

1. **Bill Create → Submit → Approve → Schedule → Pay** — The core flow from end to end. A Submitter creates a bill (with optional PDF), it goes to Pending Approval, an Approver approves it, then schedules a payment or pays immediately.
2. **Reject → Edit & Resubmit** — An Approver can reject a bill with feedback; the Submitter edits it (pre-populated form + PDF viewer) and resubmits as Pending Approval.
3. **Pay Now / Schedule / Reschedule / Cancel Payment** — Full payment flexibility: pay instantly, schedule for later, reschedule an existing scheduled payment, or cancel it.
4. **Overdue detection & resolution** — Bills past due are flagged as Overdue; the primary action guides the user to resolve payment.
5. **Card type enforcement** — SchedulePaymentModal validates that ACH payments have a Debit card and Card payments have a Credit card before allowing submission.

## What Was Left Out (and Why)

| Feature | Reason |
|---|---|
| **Real bank integration (Plaid, Stripe)** | Would require third-party API keys, webhook handling, and compliance (ACH origination). The app simulates payment execution with a generated transaction reference. |
| **Multi-currency / international payments** | Adds significant complexity (FX rates, SWIFT, compliance). All amounts are in USD. |
| **Email notifications** | Would require an email service (SendGrid, SES) and background job queue. The Settings page has a mock Notifications section as a placeholder. |
| **File storage (S3 / Cloudinary)** | Railway's ephemeral filesystem means uploaded PDFs are lost on redeploy. For production you'd swap multer's disk storage to S3 or Cloudinary. |
| **OAuth / SSO** | Simple JWT email+password auth is sufficient for demo purposes. |
| **Approval workflows (multi-level)** | The model supports a single approver. Multi-level approval (e.g., manager → director → CFO) would need a separate approval chain table. |
| **Audit log** | No dedicated audit trail table. Status changes are tracked implicitly via timestamps and the `approvedById`/`createdById` fields. |
| **Unit / integration tests** | Not included in the initial build; the app was developed iteratively with manual testing. |
| **CI/CD pipeline** | No GitHub Actions or similar configured. Deployment is manual via Railway + Netlify. |

## Local Setup

### Prerequisites

- Node.js >= 20
- PostgreSQL running locally on port 5432
- npm

### 1. Clone and install

```bash
git clone <repo>
cd accounts-payable-app

# Backend
cd api
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure environment

```bash
# api/.env
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=accountspayable
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_token
JWT_EXPIRES_IN=7d
```

Create the PostgreSQL database:

```bash
createdb accountspayable
```

### 3. Run

```bash
# Terminal 1 — Backend (auto-restarts on changes)
cd api
npm run dev

# Terminal 2 — Frontend (Vite dev server with proxy)
cd client
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies `/api` and `/uploads` to the backend at `http://localhost:5000`.

### 4. Seed data

The first time the backend starts, it runs `sequelize.sync({ alter: true })` and seeds three users:

| Email | Password | Role |
|---|---|---|
| admin@example.com | password123 | Admin |
| approver@example.com | password123 | Approver |
| submitter@example.com | password123 | Submitter |

Two vendors (Acme Corporation, Globex Corp) and two sample bills are also created.

## Key Architecture Decisions

### Actions computed on the frontend

Rather than storing a `VIRTUAL` field in the Bill model (which would require a database query to compute), the frontend function `getActions(billStatus, paymentStatus)` (`client/src/utils/billActions.ts`) returns the correct primary and secondary actions for every (status, paymentStatus) pair. This keeps the API response lean and makes action logic easy to test and modify.

### Sequelize sync with `alter: true`

The server uses `sequelize.sync({ alter: true })` on startup, which creates tables and applies non-destructive schema changes automatically. This is convenient for development but should be replaced with proper migrations in production.

### ENUM-driven state machine

Both `Bill.status` and `Payment.status` are PostgreSQL ENUMs, enforced at the database level. The frontend mirrors these as TypeScript union types (`client/src/types/index.ts`). The `getActions` function implements the state transitions implicitly — there is no explicit state machine library.

### UUID primary keys

All models use UUIDv4 primary keys, making them safe to expose in URLs and APIs without sequential ID enumeration attacks.

### `VITE_API_URL` with fallback to Vite proxy

In development, `VITE_API_URL` is undefined and the axios `baseURL` falls back to `/api`, which Vite's dev server proxies to `http://localhost:5000`. In production, `VITE_API_URL` is set to the Railway backend URL (including the `/api` prefix), so all API calls go directly to the deployed backend.

### PDF URLs resolved at render time

The backend stores PDF paths as relative (`/uploads/filename.pdf`). The frontend (`ViewDetailsModal.tsx`) prepends the backend origin from `VITE_API_URL` so the `<embed>` tag points to `https://backend.railway.app/uploads/filename.pdf` in production, rather than breaking against the Netlify domain.

### Card type constraint at DB level

The Card model has a `UNIQUE(createdById, type)` index, enforced by PostgreSQL. This guarantees at most one Debit and one Credit card per user without application-level checks.

### Custom `confirmToast` replaces `window.confirm`

All destructive actions (delete, cancel payment) use a custom `confirmToast(message)` utility (`client/src/utils/confirmToast.tsx`) that renders a confirm/cancel toast via react-hot-toast, keeping the UI consistent without native browser dialogs.

## Data Model

```
User ──┬── createdBills (Bill)
       ├── approvedBills (Bill)
       └── cards (Card)

Vendor ── bills (Bill)

Bill ──┬── payments (Payment)
       ├── vendor → Vendor
       ├── creator → User
       └── approver → User

Payment ── bill → Bill

Card ── creator → User
```

### Bill statuses

```
Draft → Pending Approval → Approved → Paid
                         → Rejected → (edit → Pending Approval)
                                     → Cancelled
           Approved → Overdue → Paid
```

### Payment statuses

```
Not Scheduled → Scheduled → Processing → Paid
                                      → Failed → (retry)
                                      → Cancelled
                                      → Refunded
```
