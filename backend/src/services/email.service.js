const nodemailer = require("nodemailer");

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
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    timeZone: HOSPITAL_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatHospitalTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("en-IN", {
    timeZone: HOSPITAL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatHospitalDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

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
 * SMTP CONFIGURATION
 * =====================================================
 */

const smtpHost = process.env.SMTP_HOST;

const smtpPort = Number(
  process.env.SMTP_PORT || 465
);

const smtpSecure =
  process.env.SMTP_SECURE === "true" ||
  smtpPort === 465;

const smtpUser = process.env.SMTP_USER;

const smtpPassword =
  process.env.SMTP_PASSWORD;

const mailFrom =
  process.env.MAIL_FROM || smtpUser;

/*
 * Never print password.
 */

console.log("SMTP configuration loaded:", {
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  user: smtpUser || "NOT_CONFIGURED",
  passwordConfigured: Boolean(
    smtpPassword
  ),
  from: mailFrom || "NOT_CONFIGURED",
});

if (!smtpHost) {
  console.warn(
    "WARNING: SMTP_HOST is not configured."
  );
}

if (!smtpUser || !smtpPassword) {
  console.warn(
    "WARNING: SMTP_USER or SMTP_PASSWORD is not configured."
  );
}

/*
 * =====================================================
 * NODEMAILER TRANSPORTER
 * =====================================================
 */

const transporter =
  nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,

    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

/*
 * =====================================================
 * VERIFY SMTP
 * =====================================================
 *
 * Does NOT send an email.
 * It only verifies SMTP connection/configuration.
 */

const verifyEmailTransporter =
  async () => {
    if (!smtpHost) {
      throw new Error(
        "SMTP_HOST is not configured"
      );
    }

    if (!smtpUser || !smtpPassword) {
      throw new Error(
        "SMTP credentials are not configured"
      );
    }

    try {
      await transporter.verify();

      console.log(
        "SMTP transporter verified successfully."
      );

      return true;
    } catch (error) {
      console.error(
        "SMTP transporter verification failed:",
        {
          code: error.code,
          command: error.command,
          message: error.message,
        }
      );

      throw error;
    }
  };

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
    throw new Error(
      "Recipient email is required"
    );
  }

  if (!smtpHost) {
    throw new Error(
      "SMTP_HOST is not configured"
    );
  }

  if (!smtpUser || !smtpPassword) {
    throw new Error(
      "SMTP credentials are not configured"
    );
  }

  if (!mailFrom) {
    throw new Error(
      "MAIL_FROM is not configured"
    );
  }

  try {
    const info =
      await transporter.sendMail({
        from: mailFrom,
        to,
        subject,
        html,
      });

    console.log(
      "Email sent successfully:",
      {
        messageId: info.messageId,
        to,
        subject,
      }
    );

    return info;
  } catch (error) {
    console.error(
      "Email sending failed:",
      {
        code: error.code,
        command: error.command,
        response: error.response,
        message: error.message,
      }
    );

    throw error;
  }
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