# Appointment Cancellation / Rebooking Fix

## Root cause

The application code already contains the correct business rule for active-slot protection: only `booked`, `waiting`, and `in-progress` appointments occupy a slot. Cancelled appointments are excluded from the application duplicate check and from the intended MongoDB partial unique indexes.

The production failure can therefore persist when an existing MongoDB database still contains a legacy unique index on the same appointment slot/token keys without the active-status partial filter. Updating a Mongoose schema does not rewrite an already-created MongoDB index. Such a stale index continues to treat cancelled records as occupying the slot and/or token.

## Corrected behavior

- Cancelled appointments remain in the database and history.
- Cancelled appointments do not block the exact doctor/date/time slot.
- Cancelled appointment tokens are returned to `QueueCounter.availableTokens`.
- The lowest safely available cancelled token is reused first.
- Active token numbers are never renumbered.
- Active appointment and queue-token uniqueness remains enforced by MongoDB partial unique indexes.
- The existing application-level duplicate checks continue to reject active duplicate bookings.

## Database indexes

The intended active-only unique indexes are:

1. `Appointment`: `{ doctor: 1, appointmentDate: 1 }`
   - unique
   - partial filter: `status in [booked, waiting, in-progress]`

2. `Appointment`: `{ doctor: 1, tokenDate: 1, tokenNumber: 1 }`
   - unique
   - partial filter: `status in [booked, waiting, in-progress]`

3. `Appointment`: `{ patient: 1, doctor: 1, tokenDate: 1 }`
   - unique
   - partial filter: `status in [booked, waiting, in-progress]`

4. `QueueEntry`: `{ doctor: 1, queueDate: 1, tokenNumber: 1 }`
   - unique
   - partial filter: `status in [booked, waiting, in-progress]`

The existing `appointment`-identity uniqueness on `QueueEntry` remains intentionally unchanged because it protects the one-to-one appointment/queue-entry relationship and does not prevent token reuse.

## Migration

Run this once against the existing MongoDB database after deploying the corrected source:

```bash
cd backend
npm run migrate:appointment-indexes
```

The migration is idempotent. It inspects existing unique indexes, detects legacy unique indexes with the same key pattern but the wrong partial filter, drops only those legacy indexes, verifies active duplicate groups before creating the replacement, and leaves unrelated indexes/data untouched.

If the migration reports active duplicate records, stop and resolve those active duplicates before retrying. The migration intentionally does not delete appointment history.

## Verification performed on the uploaded source tree

- Appointment index unit tests: passed.
- Queue token index unit test: passed.
- Full backend unit test command: 9 passed, 0 failed.
- Backend JavaScript syntax check: passed for all backend source/scripts/tests.
- Frontend lint/build could not be executed from the uploaded archive because its bundled native optional dependencies are incomplete for this Linux runtime (`oxlint`/`rolldown` native bindings are missing). The source tree's existing `frontend/dist` artifact was not used as proof of a fresh build.

## Important deployment note

A source-code/schema update alone is not sufficient for an already-existing MongoDB deployment if legacy indexes remain. The migration command above is part of the production fix and must be run against the actual database that is returning the 409 conflict.
