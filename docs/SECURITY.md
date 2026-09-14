# Security Notes

- Authentication uses an HttpOnly `accessToken` cookie with a 15-minute expiry.
- `Secure` is enabled in production and `SameSite=Strict` is used in production.
- Bearer authorization remains accepted temporarily for compatibility; clients
  must not persist bearer tokens in local storage.
- Backend role middleware and object ownership checks are authoritative.
- Uploads are limited to 5 MB and JPEG/PNG/WebP MIME types.
- Audit metadata must never contain passwords, tokens, MFA secrets, or medical
  record contents.
- Configure a production CSP at the reverse proxy after validating the deployed
  frontend asset policy. The current Helmet defaults are intentionally retained
  to avoid breaking Vite assets.
- TOTP MFA and refresh-session rotation are being added as separate privileged
  authentication controls; patients remain password-only unless policy changes.
