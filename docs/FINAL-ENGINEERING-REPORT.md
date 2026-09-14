# Final Engineering Report

## Status by engineering area

- **Architecture:** Express/Mongoose backend and React/Vite frontend remain
  intact; verification used an isolated API process and dedicated database.
- **Authentication:** HttpOnly access and refresh cookies, protected routes, and
  session restoration are implemented and HTTP-verified.
- **MFA:** Privileged-role TOTP, encrypted secrets, QR provisioning, and
  password re-authenticated disablement are implemented; full browser MFA flow
  remains unverified.
- **Session security:** Refresh rotation, reuse-family revocation, logout, and
  password-reset invalidation are implemented and partially integration-tested.
- **Authorization:** Role restrictions, malformed-ID handling, and unrelated
  medical-record protection passed isolated HTTP tests.
- **Database integrity:** Unique appointment constraints and atomic queue
  counter/selection logic passed isolated race scenarios.
- **Appointment concurrency:** Same-slot and same-patient/day races passed.
- **Queue concurrency:** Call Next, Cancel vs Call Next, and Complete vs Call
  Next passed with current-day queue fixtures.
- **Queue representation:** An ordered `QueueEntry` collection now mirrors
  active appointment tokens and lifecycle state; the existing lowest-token
  selection remains authoritative FIFO. A dedicated persistence test is still
  required.
- **Missed appointments:** A server-side atomic worker cancels past booked or
  waiting appointments, marks the reason as `missed`, updates queue entries,
  and records an audit event. Scheduler execution was not included in the
  isolated test count.
- **Consultation fees:** Doctor detail responses already expose the persisted
  fee and the patient detail UI now renders it safely in INR. Doctor profile
  fee changes emit `DOCTOR_FEE_UPDATED` audit events.
- **Doctor lifecycle:** Suspension is a soft state; Doctor documents and
  historical references remain intact. Login, refresh, existing protected
  sessions, doctor operations, booking discovery, availability, and doctor
  queue Socket.IO joins are blocked while suspended. Re-activation permits
  fresh authentication; revoked sessions are not restored.
- **Doctor biographies:** The `Doctor` model now persists an optional,
  doctor-editable 2000-character `bio`. The patient detail API returns it as
  professional profile data, and the patient page renders only persisted text.
- **Socket.IO security:** Cookie/session validation, doctor ownership,
  patient-appointment authorization, acknowledgements, and queue events passed
  with real clients. Automated reconnect assertion remains unverified.
- **Timezone correctness:** Asia/Kolkata boundary unit coverage passed; broader
  duplicate-date-construction audit remains partial. Admin dashboard day
  boundaries now use the shared hospital-day range helper.
- **Auditability:** Core authentication, session, MFA, booking, and lifecycle
  events are recorded; broader domain-event coverage remains partial.
- **Observability:** Request IDs, structured logs, protected metrics, and
  provider hooks are present; external provider configuration is not verified.
- **Testing:** Exact executed counts are recorded in
  [FINAL-TEST-REPORT.md](./FINAL-TEST-REPORT.md).
- **Frontend:** Build/lint passed; public and unauthenticated protected-route
  runtime checks completed. Admin pagination now uses server-side query
  parameters. Full authenticated browser workflows remain unverified.
- **CI/CD:** Existing workflow covers static checks and unit tests; it does not
  claim unavailable browser or infrastructure suites.
- **Backup/recovery:** Procedures are documented; infrastructure execution is
  not verified.
- **SRS compliance:** Verified and partial statuses are recorded in the
  compliance and traceability reports without upgrading unavailable evidence.

## Delivered

- HttpOnly cookie authentication with short-lived access tokens.
- Hashed refresh-token sessions with atomic rotation and refresh-family
  revocation when reuse is detected.
- Password reset invalidates active sessions.
- TOTP MFA for doctors and administrators, including encrypted secrets,
  authenticator QR provisioning, login verification, and password
  re-authentication before disablement.
- Protected Socket.IO queue-room joins with session validation, doctor
  ownership checks, and patient appointment checks.
- Database-side pagination, booking/queue uniqueness safeguards, audit events,
  request correlation, protected metrics, and production-safe error responses.
- Frontend session restoration, request timeouts, MFA login/settings screens,
  and explicit loading/error handling improvements.

## Verification executed

- Backend unit tests: 3 passed (`dateTime`, `email`, and `mfa` suites).
- Isolated MongoDB integration/security verification passed for health,
  authentication, authorization, session rotation, and malformed-ID handling.
- Admin doctor lifecycle verification passed for admin success, non-admin
  denial, invalid lifecycle state, and malformed doctor ID.
- Isolated concurrency verification passed for same-slot booking, same
  patient/day conflicts, simultaneous Call Next, Cancel vs Call Next, and
  Complete vs Call Next.
- Real Socket.IO clients verified queue-room authorization and `queueUpdated`
  delivery without medical-record payloads.
- Backend JavaScript syntax checks: passed.
- Frontend lint: passed with the pre-existing Fast Refresh warning in
  `frontend/src/context/AuthContext.jsx`.
- Frontend production build: passed with the existing bundle-size warning.

## Not verified

- MongoDB-backed IDOR, refresh-race, booking-race, queue-race, and password
  reset integration tests beyond the executed scenarios.
- Automated Socket.IO reconnect assertion.
- Browser end-to-end tests.
- Dedicated automated queue-token uniqueness assertion.
- Full authenticated browser pagination and loading-state workflows.
- Automated Socket.IO reconnect-bypass assertion.
- Full audit-event coverage across every listed domain mutation.
- External monitoring, backup, and recovery infrastructure.

These items are explicitly not marked as passing because an isolated MongoDB
and browser test environment are not configured in this workspace.
