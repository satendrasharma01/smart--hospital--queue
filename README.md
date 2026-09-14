# Smart Hospital Queue System

Smart Hospital Queue System is a role-based healthcare queue application built
with an Express/Mongoose API, MongoDB, React/Vite frontend, and Socket.IO
realtime queue updates.

## Product scope

- **Patients:** discover active doctors, inspect professional profiles,
  availability, consultation fees and bio, book appointments, view tokens and
  queue status, and access authorized medical records.
- **Doctors:** manage professional profile and bio, consultation fee and
  availability, operate the FIFO queue, call the next patient, complete
  consultations, and manage authorized medical records.
- **Administrators:** monitor operations, manage doctors and departments,
  manage doctor lifecycle state, and inspect patients and appointments.

Doctor suspension is a soft lifecycle transition. Doctor documents and
historical references remain in MongoDB; suspended doctors are blocked from
login, refresh, protected operational requests, booking discovery, queue
operations, availability operations, and operational Socket.IO queue access.

## Architecture

```text
React/Vite frontend
        |
        | HTTPS / HttpOnly cookies / Socket.IO
        v
Express API + middleware + controllers
        |
        +--> MongoDB / Mongoose models and indexes
        +--> SMTP email provider
        +--> Cloudinary profile images
        +--> Socket.IO queue rooms
```

The backend keeps business-day calculations in `Asia/Kolkata`, stores
appointments in UTC-compatible MongoDB dates, allocates tokens atomically, and
uses the persistent `QueueEntry` model as an ordered queue representation while
retaining Appointment as the booking record.

## Local development

Requirements: Node.js 22+, MongoDB 7+, and PowerShell on Windows.

1. Copy `backend/.env.example` to `backend/.env` and configure a dedicated
   development MongoDB URI and JWT secret.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Install dependencies:

   ```powershell
   npm ci
   npm ci --prefix backend
   npm ci --prefix frontend
   ```

4. Start both applications:

   ```powershell
   npm run dev
   ```

The API and frontend ports are controlled by the environment templates. Never
use production credentials in local files or tests.

## Verification

```powershell
npm test --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
Get-ChildItem backend\src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

The repository contains unit coverage for timezone boundaries, email escaping,
MFA/TOTP encryption, and doctor bio validation. Real MongoDB integration,
security, concurrency, Socket.IO and browser-E2E checks require the isolated
verification environment described in [TESTING.md](docs/TESTING.md).

## Security baseline

- HttpOnly access and refresh cookies.
- Short-lived access tokens and hashed rotating refresh sessions.
- Refresh-family reuse revocation.
- Privileged doctor/admin MFA with encrypted TOTP secrets.
- Server-side role and object authorization.
- Atomic appointment and queue constraints.
- Request IDs, audit logging, rate limiting, Helmet, and safe public errors.
- No access-token persistence in browser localStorage.

See [SECURITY.md](docs/SECURITY.md), [DEPLOYMENT.md](docs/DEPLOYMENT.md), and
[FINAL-PORTFOLIO-ENGINEERING-REPORT.md](docs/FINAL-PORTFOLIO-ENGINEERING-REPORT.md)
for implementation decisions, deployment requirements, and known limitations.

## Engineering status

This is a portfolio-grade engineering project, not certified clinical
production software. Infrastructure-dependent claims remain explicitly marked
`NOT VERIFIED` in the final reports. External monitoring, backup restore,
Docker deployment, OpenAPI publication, and automated browser E2E require
additional environment setup.
