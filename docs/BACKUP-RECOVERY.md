# Backup and Recovery

## Current state

The application does not provision backups. MongoDB backup scheduling, retention,
encryption and off-site storage remain infrastructure responsibilities.

## Recommended procedure

1. Configure encrypted MongoDB Atlas or `mongodump` backups with a documented
   retention policy.
2. Define RPO/RTO with the operator; verify them during a restore drill.
3. Restore into an isolated database, verify indexes and run smoke tests.
4. Rotate JWT, SMTP, Cloudinary and database credentials after a suspected
   compromise.
5. Record the incident, restored snapshot, verification results and cutover.

Never run a restore or migration against production without an approved backup
and rollback plan.

## Recommended targets

- RPO: <= 15 minutes
- RTO: <= 1 hour

These are targets, not currently configured guarantees. Configure continuous
MongoDB point-in-time backups or an equivalent managed backup service, retain
encrypted snapshots for the agreed retention period, and perform a quarterly
isolated restore verification.
