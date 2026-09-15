/*
 * One-time local Gmail OAuth authorization helper.
 *
 * Prerequisites:
 *   1. Enable Gmail API in Google Cloud.
 *   2. OAuth consent screen: External.
 *   3. Add the Gmail sender account as a Test User.
 *   4. OAuth Web client redirect URI:
 *      http://localhost:5000/api/auth/google/callback
 *
 * Run from backend:
 *   GMAIL_CLIENT_ID="..." GMAIL_CLIENT_SECRET="..." node scripts/gmail-authorize.js
 *
 * On Windows PowerShell:
 *   $env:GMAIL_CLIENT_ID="..."
 *   $env:GMAIL_CLIENT_SECRET="..."
 *   node scripts/gmail-authorize.js
 *
 * The script prints the refresh token once authorization completes.
 * Keep that token secret. Put it in Render as GMAIL_REFRESH_TOKEN.
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;

const redirectUri =
  process.env.GMAIL_OAUTH_REDIRECT_URI ||
  "http://localhost:5000/api/auth/google/callback";

const scope =
  "https://www.googleapis.com/auth/gmail.send";

if (!clientId || !clientSecret) {
  console.error(
    "Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET."
  );
  process.exit(1);
}

const exchangeCodeForTokens = (code) =>
  new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString();

    const request = https.request(
      {
        hostname: "oauth2.googleapis.com",
        path: "/token",
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let data = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          let parsed;

          try {
            parsed = JSON.parse(data);
          } catch {
            return reject(
              new Error(
                "Google returned invalid JSON."
              )
            );
          }

          if (
            response.statusCode < 200 ||
            response.statusCode >= 300
          ) {
            return reject(
              new Error(
                parsed.error_description ||
                  parsed.error ||
                  `HTTP ${response.statusCode}`
              )
            );
          }

          resolve(parsed);
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });

const authorizationUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope,
  }).toString();

const server = http.createServer(
  async (request, response) => {
    try {
      const url = new URL(
        request.url,
        redirectUri
      );

      if (
        url.pathname !==
        new URL(redirectUri).pathname
      ) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const error =
        url.searchParams.get("error");

      if (error) {
        response.writeHead(400, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        response.end(
          `Google authorization failed: ${error}`
        );
        server.close();
        process.exit(1);
      }

      const code =
        url.searchParams.get("code");

      if (!code) {
        response.writeHead(400);
        response.end("Missing authorization code.");
        return;
      }

      const tokens =
        await exchangeCodeForTokens(code);

      response.writeHead(200, {
        "Content-Type":
          "text/html; charset=utf-8",
      });
      response.end(`
        <h2>Smart Hospital Gmail authorization successful.</h2>
        <p>You can close this browser tab.</p>
      `);

      if (!tokens.refresh_token) {
        console.error(
          "\nGoogle did not return a refresh token. Revoke the app access and run this script again.\n"
        );
        server.close();
        process.exit(1);
      }

      console.log(
        "\nGMAIL_REFRESH_TOKEN=\n" +
          tokens.refresh_token +
          "\n"
      );

      console.log(
        "Copy this value to Render Environment Variables as GMAIL_REFRESH_TOKEN."
      );

      server.close();
    } catch (error) {
      response.writeHead(500);
      response.end("Authorization failed.");
      console.error(
        "\nAuthorization failed:",
        error.message
      );
      server.close();
      process.exit(1);
    }
  }
);

server.listen(
  new URL(redirectUri).port || 80,
  new URL(redirectUri).hostname,
  () => {
    console.log(
      "\nOpen this URL in your browser:\n"
    );
    console.log(authorizationUrl);
    console.log(
      `\nWaiting for callback at ${redirectUri} ...`
    );
  }
);
