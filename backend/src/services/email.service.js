const https = require("https");
const crypto = require("crypto");

const HOSPITAL_TIMEZONE = "Asia/Kolkata";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/*
 * =====================================================
 * DATE / TIME HELPERS
 * Hospital timezone is always Asia/Kolkata.
 * =====================================================
 */

const formatHospitalDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    timeZone: HOSPITAL_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatHospitalTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", {
    timeZone: HOSPITAL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatHospitalDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    timeZone: HOSPITAL_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/*
 * =====================================================
 * GMAIL API CONFIGURATION
 * =====================================================
 *
 * Render Free Web Services cannot use outbound SMTP ports.
 * Use Gmail's HTTPS API instead. The Gmail account remains the
 * sender (GMAIL_USER), so existing email content and callers do
 * not need to change.
 *
 * Required production variables:
 *   GMAIL_CLIENT_ID
 *   GMAIL_CLIENT_SECRET
 *   GMAIL_REFRESH_TOKEN
 *   GMAIL_USER
 */

const gmailClientId = process.env.GMAIL_CLIENT_ID;
const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;
const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
const gmailUser =
  process.env.GMAIL_USER ||
  process.env.SMTP_USER;

const gmailConfigured = Boolean(
  gmailClientId &&
  gmailClientSecret &&
  gmailRefreshToken &&
  gmailUser
);

console.log("Gmail API configuration loaded:", {
  configured: gmailConfigured,
  user: gmailUser || "NOT_CONFIGURED",
  clientIdConfigured: Boolean(gmailClientId),
  clientSecretConfigured: Boolean(gmailClientSecret),
  refreshTokenConfigured: Boolean(gmailRefreshToken),
});

/*
 * Exchange the long-lived refresh token for a short-lived
 * Gmail API access token. No OAuth client library is required.
 */

const getGmailAccessToken = () =>
  new Promise((resolve, reject) => {
    if (!gmailClientId || !gmailClientSecret || !gmailRefreshToken) {
      return reject(
        new Error(
          "Gmail API credentials are not fully configured"
        )
      );
    }

    const body = new URLSearchParams({
      client_id: gmailClientId,
      client_secret: gmailClientSecret,
      refresh_token: gmailRefreshToken,
      grant_type: "refresh_token",
    }).toString();

    const request = https.request(
      {
        hostname: "oauth2.googleapis.com",
        path: "/token",
        method: "POST",
        timeout: 10000,
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
                `Google token endpoint returned invalid JSON (HTTP ${response.statusCode})`
              )
            );
          }

          if (
            response.statusCode < 200 ||
            response.statusCode >= 300 ||
            !parsed.access_token
          ) {
            return reject(
              new Error(
                `Google token refresh failed (HTTP ${response.statusCode}): ${
                  parsed.error_description ||
                  parsed.error ||
                  "unknown error"
                }`
              )
            );
          }

          resolve(parsed.access_token);
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(
        new Error("Google token request timed out")
      );
    });

    request.on("error", reject);
    request.write(body);
    request.end();
  });

/*
 * Gmail expects a base64url-encoded RFC 2822/MIME message.
 * Headers are encoded as UTF-8 MIME words when non-ASCII occurs.
 */

const encodeHeader = (value) => {
  const stringValue = String(value ?? "");

  if (/^[\x20-\x7E]*$/.test(stringValue)) {
    return stringValue;
  }

  return `=?UTF-8?B?${Buffer.from(stringValue, "utf8").toString(
    "base64"
  )}?=`;
};

const createMimeMessage = ({
  from,
  to,
  subject,
  html,
}) => {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
  ].join("\r\n");

  return message;
};

const base64UrlEncode = (value) =>
  Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

/*
 * Send a MIME message through Gmail's HTTPS API.
 */

const sendGmailMessage = ({
  accessToken,
  rawMessage,
}) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({
      raw: base64UrlEncode(rawMessage),
    });

    const request = https.request(
      {
        hostname: "gmail.googleapis.com",
        path: `/gmail/v1/users/${encodeURIComponent(
          "me"
        )}/messages/send`,
        method: "POST",
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
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
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = {};
          }

          if (
            response.statusCode < 200 ||
            response.statusCode >= 300
          ) {
            const detail =
              parsed?.error?.message ||
              `HTTP ${response.statusCode}`;

            const error = new Error(
              `Gmail API send failed: ${detail}`
            );

            error.statusCode = response.statusCode;
            return reject(error);
          }

          resolve(parsed);
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(
        new Error("Gmail API send request timed out")
      );
    });

    request.on("error", reject);
    request.write(body);
    request.end();
  });

/*
 * =====================================================
 * GENERIC SEND EMAIL
 * =====================================================
 */

const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  if (!gmailConfigured) {
    throw new Error(
      "Gmail API is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_USER."
    );
  }

  const accessToken =
    await getGmailAccessToken();

  const rawMessage =
    createMimeMessage({
      from: `Smart Hospital <${gmailUser}>`,
      to,
      subject,
      html,
    });

  try {
    const info =
      await sendGmailMessage({
        accessToken,
        rawMessage,
      });

    console.log("Email sent successfully:", {
      messageId: info.id,
      to,
      subject,
      provider: "gmail-api",
    });

    return info;
  } catch (error) {
    console.error("Gmail API email sending failed:", {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      to,
      subject,
    });

    throw error;
  }
};

/*
 * =====================================================
 * VERIFY EMAIL PROVIDER
 * =====================================================
 *
 * This verifies that the configured refresh token can be exchanged
 * for an access token. It does NOT send a test email.
 */

const verifyEmailTransporter = async () => {
  if (!gmailConfigured) {
    throw new Error(
      "Gmail API is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_USER."
    );
  }

  await getGmailAccessToken();

  console.log("Gmail API authentication verified:", {
    user: gmailUser,
  });

  return true;
};

/*
 * =====================================================
 * PATIENT - APPOINTMENT CONFIRMATION
 * =====================================================
 */

const sendAppointmentConfirmationEmail =
  async ({
    patientName,
    patientEmail,
    doctorName,
    departmentName,
    appointmentDate,
    tokenNumber,
  }) => {
    const formattedDate =
      formatHospitalDate(
        appointmentDate
      );

    const formattedTime =
      formatHospitalTime(
        appointmentDate
      );

    return sendEmail({
      to: patientEmail,

      subject:
        "Appointment Confirmed - Smart Hospital",

      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:40px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">

              <div style="padding:24px;background:#0f172a;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;">
                  Smart Hospital
                </h1>

                <p style="margin:6px 0 0;color:#cbd5e1;">
                  Appointment Confirmation
                </p>
              </div>

              <div style="padding:28px;">

                <p style="font-size:16px;color:#0f172a;">
                  Hello ${escapeHtml(
                    patientName
                  )},
                </p>

                <p style="font-size:14px;line-height:1.6;color:#475569;">
                  Your appointment has been successfully booked.
                </p>

                <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:10px;">

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Doctor
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:16px;font-weight:bold;">
                    Dr. ${escapeHtml(
                      doctorName
                    )}
                  </p>

                  ${
                    departmentName
                      ? `
                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Department
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:15px;">
                    ${escapeHtml(departmentName)}
                  </p>
                  `
                      : ""
                  }

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Date
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:15px;">
                    ${escapeHtml(
                      formattedDate
                    )}
                  </p>

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Time
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:15px;">
                    ${escapeHtml(
                      formattedTime
                    )}
                  </p>

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Queue Token
                  </p>

                  <p style="margin:0;color:#0f172a;font-size:22px;font-weight:bold;">
                    #${escapeHtml(
                      tokenNumber
                    )}
                  </p>

                </div>

                <p style="font-size:14px;line-height:1.6;color:#475569;">
                  Please arrive on time and keep your appointment details available when visiting the hospital.
                </p>

                <p style="font-size:13px;color:#64748b;">
                  Appointment time is shown in India Standard Time (IST).
                </p>

                <p style="margin-top:28px;font-size:13px;color:#94a3b8;">
                  This is an automated notification from Smart Hospital.
                </p>

              </div>
            </div>
          </body>
        </html>
      `,
    });
  };

/*
 * =====================================================
 * DOCTOR - NEW APPOINTMENT NOTIFICATION
 * =====================================================
 */

const sendNewAppointmentDoctorEmail =
  async ({
    doctorName,
    doctorEmail,
    patientName,
    appointmentDate,
    tokenNumber,
  }) => {
    const formattedDate =
      formatHospitalDate(
        appointmentDate
      );

    const formattedTime =
      formatHospitalTime(
        appointmentDate
      );

    return sendEmail({
      to: doctorEmail,

      subject:
        "New Patient Appointment - Smart Hospital",

      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">

            <div style="max-width:600px;margin:40px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">

              <div style="padding:24px;background:#0f172a;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;">
                  Smart Hospital
                </h1>

                <p style="margin:6px 0 0;color:#cbd5e1;">
                  New Appointment Notification
                </p>
              </div>

              <div style="padding:28px;">

                <p style="font-size:16px;color:#0f172a;">
                  Hello Dr. ${escapeHtml(
                    doctorName
                  )},
                </p>

                <p style="font-size:14px;line-height:1.6;color:#475569;">
                  A new patient appointment has been booked for you.
                </p>

                <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:10px;">

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Patient
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:16px;font-weight:bold;">
                    ${escapeHtml(
                      patientName
                    )}
                  </p>

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Date
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:15px;">
                    ${escapeHtml(
                      formattedDate
                    )}
                  </p>

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Time
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:15px;">
                    ${escapeHtml(
                      formattedTime
                    )}
                  </p>

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Queue Token
                  </p>

                  <p style="margin:0;color:#0f172a;font-size:22px;font-weight:bold;">
                    #${escapeHtml(
                      tokenNumber
                    )}
                  </p>

                </div>

                <p style="font-size:14px;line-height:1.6;color:#475569;">
                  Please review the appointment from your doctor dashboard.
                </p>

                <p style="font-size:13px;color:#64748b;">
                  Appointment time is shown in India Standard Time (IST).
                </p>

                <p style="margin-top:28px;font-size:13px;color:#94a3b8;">
                  This is an automated notification from Smart Hospital.
                </p>

              </div>
            </div>

          </body>
        </html>
      `,
    });
  };

/*
 * =====================================================
 * PATIENT - APPOINTMENT COMPLETED
 * =====================================================
 */

const sendAppointmentCompletedEmail =
  async ({
    patientName,
    patientEmail,
    doctorName,
    appointmentDate,
    tokenNumber,
  }) => {
    const formattedDate =
      formatHospitalDate(
        appointmentDate
      );

    const formattedTime =
      formatHospitalTime(
        appointmentDate
      );

    return sendEmail({
      to: patientEmail,

      subject:
        "Appointment Completed - Smart Hospital",

      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">

            <div style="max-width:600px;margin:40px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">

              <div style="padding:24px;background:#0f172a;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;">
                  Smart Hospital
                </h1>

                <p style="margin:6px 0 0;color:#cbd5e1;">
                  Appointment Completed
                </p>
              </div>

              <div style="padding:28px;">

                <p style="font-size:16px;color:#0f172a;">
                  Hello ${escapeHtml(
                    patientName
                  )},
                </p>

                <p style="font-size:14px;line-height:1.6;color:#475569;">
                  Your appointment has been marked as completed.
                </p>

                <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:10px;">

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Doctor
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:16px;font-weight:bold;">
                    Dr. ${escapeHtml(
                      doctorName
                    )}
                  </p>

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Appointment Date
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:15px;">
                    ${escapeHtml(
                      formattedDate
                    )}
                  </p>

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Appointment Time
                  </p>

                  <p style="margin:0 0 18px;color:#0f172a;font-size:15px;">
                    ${escapeHtml(
                      formattedTime
                    )}
                  </p>

                  <p style="margin:0 0 10px;color:#64748b;font-size:13px;">
                    Queue Token
                  </p>

                  <p style="margin:0;color:#0f172a;font-size:22px;font-weight:bold;">
                    #${escapeHtml(
                      tokenNumber
                    )}
                  </p>

                </div>

                <p style="font-size:14px;line-height:1.6;color:#475569;">
                  Thank you for using Smart Hospital.
                </p>

                <p style="font-size:13px;color:#64748b;">
                  Appointment time is shown in India Standard Time (IST).
                </p>

                <p style="margin-top:28px;font-size:13px;color:#94a3b8;">
                  This is an automated notification from Smart Hospital.
                </p>

              </div>
            </div>

          </body>
        </html>
      `,
    });
  };

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  escapeHtml,

  formatHospitalDate,
  formatHospitalTime,
  formatHospitalDateTime,

  sendEmail,

  sendAppointmentConfirmationEmail,

  sendNewAppointmentDoctorEmail,

  sendAppointmentCompletedEmail,

  verifyEmailTransporter,
};