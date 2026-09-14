# SRS v2.0 Implementation Traceability

This traceability matrix records the implementation status that is verifiable in
the current repository. Infrastructure-dependent items are not marked complete
without a configured service or an automated verification.

| Requirement | Current implementation | Files involved | Status | Change/test |
|---|---|---|---|---|
| Hospital timezone: Asia/Kolkata | Central date utility and queue/booking consumers | `backend/src/utils/dateTime.js`, appointment and queue controllers | Implemented | Boundary tests still required |
| DoctorAvailability is canonical | Booking reads `DoctorAvailability`; migration is idempotent; legacy field is read-only | `backend/src/models/DoctorAvailability.js`, `backend/scripts/migrate-availability.js` | Partial | Run migration, then remove legacy field in a later controlled release |
| Concurrent active slot protection | MongoDB partial unique indexes and duplicate-key 409 handling | `backend/src/models/Appointment.js`, appointment controller | Verified | Isolated same-slot and same-patient/day concurrent HTTP tests passed |
| One active consultation per doctor | Unique partial index and atomic `findOneAndUpdate` | `Appointment.js`, queue controller | Verified | Isolated simultaneous Call Next, Cancel vs Call Next, and Complete vs Call Next tests passed |
| Database-side pagination/filtering | Admin patient and appointment endpoints support page/limit and filters; frontend sends page/filter query parameters and consumes pagination metadata | admin controller, `AdminPatients.jsx`, `AdminAppointments.jsx` | Verified | Authenticated browser pagination workflow remains unverified |
| Secure sessions | HttpOnly short-lived cookie; hashed refresh-token rotation with family reuse revocation; bearer token remains compatibility fallback | auth controller, Session model, auth middleware, frontend API/AuthContext | Implemented | Requires MongoDB race verification |
| Audit logging | Append-oriented AuditLog model and login/lifecycle events | `AuditLog.js`, audit service | Partial | Add remaining domain events |
| Admin department CRUD | Create/update/deactivate-safe delete with admin authorization | department controller/routes | Implemented | Add frontend admin screen |
| Doctor lifecycle | Soft active/inactive/suspended state; centralized session/protected-route enforcement; booking, discovery, availability, and Socket.IO guards | Doctor model, auth middleware/controller, admin controller/routes, doctor/availability controllers, server socket authorization, `AdminDoctors.jsx` | Implemented | Isolated MongoDB persistence, session revocation, and reactivation passed; full HTTP/Socket.IO suspension suite remains not verified |
| Request IDs/metrics | Correlation header, structured request logs, protected metrics endpoint | request context middleware, server | Implemented | External exporter not configured |
| Production error response safety | Generic public messages for internal controller failures; detailed errors remain server-side | server error handler, appointment/admin/doctor/patient controllers | Verified | Static error-leak scan and invalid-date endpoint test passed |
| Environment configuration hygiene | `.env.example` templates and ignored `.env` files | backend/frontend `.env.example`, `.gitignore` | Partial | Local environment files contain credentials and require manual rotation before distribution |
| Production-safe errors | Generic 5xx response and request ID; safe upload errors | server error handler | Implemented | Existing controller catches should be migrated gradually |
| Email HTML escaping | Dynamic email values escaped | email service/auth controller | Implemented | Add template tests |
| CI/test suite | Frontend lint/build, backend syntax checks, and unit tests for timezone/email/TOTP | package manifests, `.github/workflows/ci.yml`, `backend/tests/unit` | Partial | Integration, security, concurrency and E2E suites require isolated test DB setup |
| Privileged MFA | Encrypted TOTP secret, QR provisioning, login challenge, password re-authenticated disablement | auth controller, MFA utility, MfaSettings/Login pages | Partial | Recovery codes and MongoDB-backed flow tests remain |
| Socket queue authorization | Authenticated socket event acknowledgement; doctor ownership and patient active-appointment checks | `backend/src/server.js`, `frontend/src/services/socket.js` | Verified | Real Socket.IO clients passed ownership, appointment, and queueUpdated checks; reconnect remains unverified |
| Ordered queue representation | `QueueEntry` persistence plus token-sorted queue stack response | `backend/src/models/QueueEntry.js`, `backend/src/controllers/appointment.controller.js`, `backend/src/controllers/queue.controller.js` | Implemented | FIFO is preserved; dedicated persistence/concurrency test remains not verified |
| Missed appointment handling | Atomic worker and cancellation reason | `backend/src/services/missedAppointment.service.js`, `backend/src/models/Appointment.js`, `backend/src/server.js` | Implemented | Scheduler/race/idempotency execution remains not verified |
| Consultation fee visibility | Doctor detail API and patient display | `backend/src/controllers/doctor.controller.js`, `frontend/src/pages/patient/PatientDoctorDetails.jsx` | Implemented | Authenticated fee API/UI verification remains not verified |
