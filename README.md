# Smart Hospital Queue System

A production-oriented full-stack hospital appointment and real-time queue management platform built with React, Node.js, Express, MongoDB, Mongoose and Socket.IO.

> **Portfolio project:** demonstrates backend engineering, database integrity, authentication/authorization, real-time systems, queue management, concurrency protection and production hardening. It is not certified clinical software.

## What the system solves

Traditional appointment systems often stop at booking. This project models the complete operational lifecycle:

```text
Patient discovers doctor
        ↓
Selects availability
        ↓
Books appointment + token
        ↓
Waits in persistent FIFO queue
        ↓
Doctor calls next patient
        ↓
Consultation completed / missed / cancelled
        ↓
Queue and appointment state remain consistent
```

A cancelled appointment remains in history but no longer occupies its active slot or token. Rebooking can safely reuse an available cancelled token without renumbering active tokens.

## Core features

### Patient
- Secure registration and login
- Profile setup and editing
- Browse active doctors and departments
- View doctor profile, bio, availability and consultation fee
- Book appointments from real availability
- View appointment and token status
- Cancel eligible appointments
- Rebook a released slot
- View authorized medical records
- Real-time queue updates

### Doctor
- Secure login with privileged-access MFA support
- Professional profile and consultation fee management
- Availability management
- Patient/appointment visibility according to authorization rules
- Persistent FIFO queue operation
- Call Next patient
- Complete or mark eligible appointments through the queue lifecycle
- Authorized medical-record management

### Administrator
- Protected administrative dashboard
- Doctor lifecycle management: active, inactive and suspended
- Doctor and patient management
- Department CRUD
- Appointment/operational monitoring
- Audit-log support for security-sensitive operations

## Engineering highlights

- **RBAC:** patient, doctor and admin roles with server-side authorization
- **Session security:** HttpOnly cookies, short-lived access tokens and rotating refresh sessions
- **MFA:** encrypted TOTP support for privileged users
- **Database integrity:** MongoDB/Mongoose constraints and partial unique indexes for active records
- **Appointment safety:** active-only slot uniqueness; cancelled appointments remain historical
- **Token allocation:** reusable cancelled tokens plus protection against duplicate active tokens
- **Concurrency:** database-level constraints and atomic operations protect competing bookings
- **Queue:** persistent `QueueEntry` state and FIFO Call Next behavior
- **Real-time:** Socket.IO queue rooms with server-side authorization
- **Timezone:** centralized hospital timezone handling using `Asia/Kolkata`
- **Security:** Helmet, rate limiting, request IDs, safe public errors, validation and audit logging
- **Observability:** health/metrics endpoints, structured request context and monitoring abstraction
- **Data lifecycle:** missed-appointment processing and index migration scripts
- **No operational mock data:** hospital state comes from the API/database/user actions

## Architecture

```mermaid
flowchart LR
    UI[React + Vite + Tailwind]
    API[Node.js + Express API]
    AUTH[Auth / RBAC / Security]
    DOMAIN[Appointment + Queue Services]
    DB[(MongoDB)]
    REALTIME[Socket.IO]
    MAIL[SMTP / Email]
    CLOUD[Cloudinary]

    UI -->|HTTPS + cookies| API
    UI <-->|authorized realtime events| REALTIME
    API --> AUTH
    API --> DOMAIN
    DOMAIN --> DB
    REALTIME --> DOMAIN
    API --> MAIL
    API --> CLOUD
```

### Main domain flow

```text
Appointment
   │
   ├── booking state
   ├── doctor/date/time
   └── token number
          │
          ▼
     QueueEntry
          │
          ├── waiting
          ├── in-progress
          ├── completed
          └── cancelled

QueueCounter
   └── coordinates safe token allocation/reuse
```

## Repository structure

```text
smart--hospital--queue/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   ├── scripts/              # migrations and operational scripts
│   └── tests/                # automated backend/unit coverage
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── public/
├── docs/                     # security, testing, deployment and engineering docs
├── scripts/                  # repository-level validation scripts
└── .github/workflows/        # CI validation
```

## UI/UX and responsive design

- Responsive layouts across desktop, tablet and mobile breakpoints
- Admin dashboard with persistent desktop sidebar and mobile navigation drawer
- Responsive patient and doctor navigation
- Mobile-friendly forms, cards, filters and operational views
- Responsive public navigation with mobile menu
- Accessible navigation labels, focus states and touch-friendly controls
- Dedicated 404 page for unknown routes
- No horizontal viewport overflow from long operational content

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router |
| API | Node.js 22+, Express 5 |
| Database | MongoDB, Mongoose |
| Realtime | Socket.IO |
| Authentication | JWT, HttpOnly cookies, rotating refresh sessions |
| Security | Helmet, express-rate-limit, express-validator, MFA/TOTP |
| Files/media | Cloudinary + Multer |
| Email | Nodemailer / SMTP |
| Validation | Node test runner + frontend lint/build |
| Deployment | Vercel-compatible frontend configuration + production backend configuration |
| CI | GitHub Actions |

## Local development

### Requirements

- Node.js 22+
- MongoDB 7+
- npm

### 1. Configure environment

Copy the safe templates:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Use a dedicated development database and development secrets. Never commit `.env` files or production credentials.

### 2. Install dependencies

```powershell
npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

### 3. Start the application

```powershell
npm run dev
```

### Useful validation commands

```powershell
npm test
npm run lint
npm run build
npm run check:backend
```

Equivalent package-level commands are available under `backend/` and `frontend/`.

## Existing database migration

If an existing MongoDB database was created before the active-only appointment/token indexes were introduced, run the idempotent index migration before relying on cancellation/rebooking:

```powershell
npm run migrate:appointment-indexes --prefix backend
```

The migration is designed to correct stale legacy index definitions without deleting appointment history.

## Cancellation and token-reuse integrity

The important invariant is:

```text
ACTIVE appointment
    → blocks doctor/date/time slot
    → occupies active token

CANCELLED appointment
    → remains in history
    → does not block the slot
    → does not permanently consume the token
```

Example:

```text
Before:
Token #1 = cancelled
Token #2 = active

Next safe booking:
Token #1 = new active appointment
Token #2 = unchanged
```

Concurrent requests are still protected so two patients cannot create duplicate active bookings for the same constrained slot/token.

## Testing and CI

The repository includes backend unit coverage and focused appointment-index verification. GitHub Actions validates:

1. dependency installation
2. backend JavaScript syntax
3. backend tests
4. frontend lint
5. frontend production build

The repository intentionally does not claim automated browser E2E coverage until a real Playwright/Cypress suite is installed and executed.

See:

- `docs/TESTING.md`
- `docs/FINAL-TEST-REPORT.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP-RECOVERY.md`
- `docs/FINAL-PORTFOLIO-ENGINEERING-REPORT.md`
- `docs/SRS-IMPLEMENTATION-TRACEABILITY.md`

## Security notes

Never commit:

- `.env`
- JWT secrets
- MongoDB credentials
- SMTP passwords/app passwords
- Cloudinary secrets
- production API keys

Only placeholder configuration belongs in `.env.example` files.

## Production-readiness boundary

This is a **portfolio-grade engineering project**. It demonstrates production-oriented practices, but that does not mean it is certified or approved for real clinical use.

Infrastructure-dependent capabilities must be verified in the target deployment environment, including external monitoring, backup restoration, browser E2E, Docker-based deployment and OpenAPI publication.

## Portfolio talking points

When presenting this project in an interview, focus on engineering decisions rather than the number of pages:

- Why appointment uniqueness is enforced at the database layer
- Why cancelled records are retained but excluded from active uniqueness
- How token reuse avoids renumbering active patients
- How concurrent booking requests are protected
- Why Socket.IO is not used as the authorization boundary
- Why HttpOnly cookies are preferred over localStorage token persistence
- How doctor suspension affects sessions and operational access
- How timezone boundaries are centralized
- How migrations protect existing production data

## License

ISC. See the root `package.json` for the project metadata.
