# Audit Logging

`AuditLog` is append-oriented and is written through `recordAudit`. It records
actor, role, action, resource, request ID, IP, success and safe metadata.
Normal users have no audit-log route and cannot mutate entries.

Currently recorded events include login, logout and doctor lifecycle changes.
Appointment, availability, medical-record and department mutations should use
the same service as they are migrated; failures are logged without exposing
request secrets.

