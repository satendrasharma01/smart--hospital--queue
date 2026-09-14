# Final Portfolio Engineering Report

## 1. Executive summary

The Smart Hospital Queue System has a strong full-stack MVP foundation with
production-oriented authentication, authorization, MongoDB constraints,
timezone handling, audit logging, realtime queue authorization, and explicit
frontend loading/error states. The current repository is suitable for a
portfolio demonstration, but it is not certified clinical production
software and several infrastructure-dependent capabilities remain unverified.

## 2. Before vs after

| Area | Current state |
|---|---|
| Authentication | HttpOnly cookies, short-lived access tokens, hashed refresh rotation and reuse-family revocation |
| Privileged access | Doctor/admin MFA with encrypted TOTP secrets and login challenge |
| Doctor lifecycle | Soft active/inactive/suspended state with session revocation and operational blocking |
| Booking | MongoDB active-slot and patient/day uniqueness constraints |
| Queue | Atomic token allocation, FIFO Call Next, persistent QueueEntry representation |
| Missed appointments | Server worker with conditional cancellation and audit event |
| Frontend | Real API data, explicit loading/error/empty states, fee and bio display |
| Verification | Unit/build/lint and selected isolated MongoDB/HTTP/Socket.IO checks; full browser E2E not available |

## 3. Architecture and engineering decisions

The existing Express/Mongoose and React/Vite architecture was retained.
MongoDB is used for durable relationships, indexes and atomic state
transitions. Socket.IO provides queue updates but is never treated as the
authorization boundary. HttpOnly cookies prevent browser JavaScript from
reading session tokens. The hospital timezone is centralized as
`Asia/Kolkata`. Doctor suspension is soft-state so appointments, records and
audit references remain intact.

## 4. Security and authorization

Server-side role checks, ownership checks, session validation, request IDs,
Helmet, rate limiting, safe error responses, protected metrics, and audit
logging are implemented. Patient, doctor and admin object authorization has
passed selected isolated checks. Full endpoint-by-endpoint automated coverage
is not yet wired into CI.

## 5. Database and domain integrity

Appointment partial unique indexes protect active slots, patient/doctor/day
conflicts, token uniqueness, and one active consultation per doctor.
`QueueEntry` provides persistent ordered queue state. The missed-appointment
worker conditionally updates only eligible past appointments. A dedicated
multi-instance worker-lock and full scheduler race suite remain unverified.

## 6. Frontend, accessibility and performance

The frontend has loading, success, empty and error paths in the audited major
flows, server-side admin pagination, responsive Tailwind layouts, labels and
visible focus states. Lint passes with an existing Fast Refresh warning.
The production build passes with a non-blocking bundle-size warning. A full
authenticated accessibility and performance measurement pass has not been run.

## 7. Testing and verification evidence

- Unit: **5 passed / 5 total**
- Existing isolated integration: **12 passed / 12 total**
- Existing isolated security: **13 passed / 13 total**
- Existing isolated concurrency: **5 passed / 5 total**
- Existing Socket.IO: **5 passed / 5 total**
- E2E: **0 passed / 0 total**
- Frontend lint: **PASS**
- Frontend build: **PASS**
- Backend syntax/module loading: **PASS**
- Additional isolated lifecycle persistence/session-revocation/reactivation:
  **PASS**

The exact scope and limitations are maintained in
[FINAL-TEST-REPORT.md](FINAL-TEST-REPORT.md).

## 8. CI/CD and deployment

The existing GitHub Actions workflow installs dependencies, checks backend
syntax, runs backend tests, lints/builds the frontend, and now fails on
high-severity `npm audit` findings instead of silently passing them.

Docker images, OpenAPI publication, automated browser E2E, backup restore
execution, external monitoring, and production deployment are not currently
configured and therefore remain `NOT VERIFIED`.

## 9. Documentation

The repository now includes a root README plus existing security, deployment,
testing, backup/recovery, traceability, compliance, engineering and test
reports. Mermaid architecture/ER/sequence diagrams and synchronized OpenAPI
documentation remain future documentation work.

## 10. Portfolio score

| Area | Score |
|---|---:|
| Architecture | 8/10 |
| Backend correctness | 8/10 |
| Frontend quality | 7/10 |
| Database integrity | 8/10 |
| Security/authentication | 8/10 |
| Authorization/IDOR | 8/10 |
| Concurrency/queue | 8/10 |
| Realtime | 7/10 |
| Testing/E2E | 5/10 |
| CI/CD | 6/10 |
| Deployment | 4/10 |
| Observability | 6/10 |
| Backup/recovery | 4/10 |
| Documentation | 7/10 |
| Accessibility/performance | 6/10 |

**Overall portfolio engineering score: 6.8/10**

## 11. Remaining limitations

- Automated browser E2E is not installed or executed.
- Full HTTP suspension/reactivation and Socket.IO suspended-room suites are not
  part of the current automated test command.
- External monitoring, production deployment, Docker, OpenAPI, and backup
  restore are not verified.
- Full audit-event coverage and multi-instance scheduler locking require
  follow-up engineering.

No unavailable capability is represented as verified.
