# Gmail API Email Delivery Fix

## Why this changed

Render Free Web Services cannot rely on outbound SMTP ports 25/465/587. The application was successfully creating appointments, but Gmail SMTP could time out, and forgot-password email could fail for the same reason.

## Implementation

`backend/src/services/email.service.js` now sends mail through the Gmail HTTPS API. Existing email functions and HTML templates are preserved.

The sender remains the configured Gmail account:

`GMAIL_USER`

Recommended production variables:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_USER`

No Gmail password or SMTP app password is required for the Gmail API path.

## One-time OAuth setup

1. Enable Gmail API in Google Cloud.
2. Use an External OAuth consent screen.
3. Add the sender Gmail account as a test user while the app is in testing.
4. Create a Web application OAuth client.
5. Add this exact authorized redirect URI:

`http://localhost:5000/api/auth/google/callback`

6. In `backend`, run:

`npm run gmail:authorize`

Set `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in the local shell first. The script prints a one-time refresh token after the Gmail account authorizes the app.

Keep the refresh token secret. Add it to Render as `GMAIL_REFRESH_TOKEN`.

## Render

Set these Environment Variables on the backend service:

`GMAIL_CLIENT_ID`
`GMAIL_CLIENT_SECRET`
`GMAIL_REFRESH_TOKEN`
`GMAIL_USER=sanysharma1659@gmail.com`

Do not commit `.env` or credentials to GitHub.

## Preserved behavior

The following existing callers continue using `sendEmail()`:

- appointment confirmation
- doctor appointment notification
- forgot-password email
- appointment completed email

The existing HTML email templates are retained.
