# API Changes

- Login now sets an HttpOnly `accessToken` cookie and no longer requires the
  frontend to persist a token. Existing bearer clients remain temporarily
  supported.
- `POST /api/auth/logout` clears the session cookie.
- `GET /api/health` reports application uptime and a coarse database state.
- Admin patient and appointment responses now include pagination metadata and
  accept `page`, `limit` and relevant database-side filters.
- Admin department CRUD is available at `/api/departments` with admin
  authorization.
- Admin doctor lifecycle changes are available at
  `/api/admin/doctors/:doctorId/lifecycle`.
- Admin department management is available through the frontend at
  `/admin/departments`.
- Responses include an `x-request-id` correlation header.
- Monitoring providers can be connected through the backend monitoring service
  abstraction without hardcoding a vendor.
