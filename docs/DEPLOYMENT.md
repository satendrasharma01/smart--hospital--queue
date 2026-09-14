# Deployment

Set `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, SMTP variables and Cloudinary
variables through the deployment secret manager. Do not commit `.env` files.
Run the idempotent availability migration before removing any legacy embedded
availability data:

```powershell
node backend\scripts\migrate-availability.js
```

Run lint, frontend build, backend syntax checks, database migration verification
and smoke tests before production approval. Configure TLS at the ingress so
production cookies can use `Secure`.

