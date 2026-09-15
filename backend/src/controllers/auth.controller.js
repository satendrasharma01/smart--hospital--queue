const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const Session = require("../models/Session");
const {
  encryptSecret,
  decryptSecret,
  generateSecret,
  verifyTotp,
} = require("../utils/mfa");

const User = require("../models/User");
const Doctor = require("../models/Doctor");
const PasswordResetToken = require("../models/PasswordResetToken");

const {
  sendEmail,
  escapeHtml,
} = require("../services/email.service");
const { recordAudit } = require("../services/audit.service");

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 15 * 60 * 1000,
};

const refreshCookieOptions = {
  ...sessionCookieOptions,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const verifyEncryptedTotp = (encryptedSecret, code) => {
  if (!encryptedSecret) return false;

  try {
    return verifyTotp(decryptSecret(encryptedSecret), code);
  } catch {
    return false;
  }
};

const issueSession = async (user) => {
  const refreshToken = crypto.randomBytes(48).toString("base64url");

  const session = await Session.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    familyId: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + refreshCookieOptions.maxAge),
  });

  const accessToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      sessionId: session._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );

  return {
    accessToken,
    refreshToken,
    session,
  };
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "patient",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while registering user",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+mfa.secret +mfa.pendingSecret");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.accountStatus && user.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "This account is not active",
      });
    }

    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({
        user: user._id,
      }).select("lifecycleStatus");

      if (!doctor || doctor.lifecycleStatus !== "active") {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not operational",
        });
      }
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (["doctor", "admin"].includes(user.role) && user.mfa?.enabled) {
      const code =
        req.body.totpCode ||
        req.body.otp ||
        req.body.mfaCode;

      if (!code || !verifyEncryptedTotp(user.mfa.secret, code)) {
        await recordAudit({
          req,
          action: "mfa_login_failed",
          resourceType: "User",
          resourceId: user._id,
          success: false,
        });

        return res.status(401).json({
          success: false,
          message: "MFA verification required",
          mfaRequired: true,
        });
      }
    }

    const { accessToken, refreshToken } = await issueSession(user);

    res.cookie(
      "accessToken",
      accessToken,
      sessionCookieOptions
    );

    res.cookie(
      "refreshToken",
      refreshToken,
      refreshCookieOptions
    );

    await recordAudit({
      req,
      action: "login",
      resourceType: "User",
      resourceId: user._id,
      metadata: {
        role: user.role,
      },
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while logging in",
    });
  }
};

const logoutUser = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await Session.updateOne(
      {
        tokenHash: hashToken(refreshToken),
        revokedAt: {
          $exists: false,
        },
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );
  }

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
  });

  await recordAudit({
    req,
    action: "logout",
    resourceType: "User",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

const refreshSession = async (req, res) => {
  const raw =
    req.cookies?.refreshToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  if (!raw) {
    return res.status(401).json({
      success: false,
      message: "Refresh token required",
    });
  }

  const currentHash = hashToken(raw);

  const session = await Session.findOneAndUpdate(
    {
      tokenHash: currentHash,
      revokedAt: {
        $exists: false,
      },
      expiresAt: {
        $gt: new Date(),
      },
    },
    {
      $set: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    },
    {
      new: false,
    }
  );

  if (!session) {
    const revokedSession = await Session.findOne({
      tokenHash: currentHash,
    }).select("familyId");

    if (revokedSession?.familyId) {
      await Session.updateMany(
        {
          familyId: revokedSession.familyId,
          revokedAt: {
            $exists: false,
          },
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        }
      );
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }

  const user = await User.findById(session.user).select(
    "+mfa.secret +mfa.pendingSecret"
  );

  if (!user || user.accountStatus !== "active") {
    return res.status(401).json({
      success: false,
      message: "Invalid session",
    });
  }

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({
      user: user._id,
    }).select("lifecycleStatus");

    if (!doctor || doctor.lifecycleStatus !== "active") {
      await Session.updateMany(
        {
          user: user._id,
          revokedAt: {
            $exists: false,
          },
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        }
      );

      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }
  }

  const next = await issueSession(user);

  await Session.updateOne(
    {
      _id: session._id,
    },
    {
      $set: {
        revokedAt: new Date(),
        replacedByHash: hashToken(next.refreshToken),
      },
    }
  );

  await recordAudit({
    req,
    action: "session_rotated",
    resourceType: "Session",
    resourceId: session._id,
    targetId: user._id,
  });

  res.cookie(
    "accessToken",
    next.accessToken,
    sessionCookieOptions
  );

  res.cookie(
    "refreshToken",
    next.refreshToken,
    refreshCookieOptions
  );

  return res.status(200).json({
    success: true,
    message: "Session refreshed",
  });
};

const setupMfa = async (req, res) => {
  if (!["doctor", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message:
        "MFA is available only for doctors and administrators",
    });
  }

  const user = await User.findById(req.user.userId).select(
    "+mfa.secret +mfa.pendingSecret"
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const secret = generateSecret();

  user.mfa.pendingSecret = encryptSecret(secret);

  await user.save();

  await recordAudit({
    req,
    action: "mfa_setup_started",
    resourceType: "User",
    resourceId: user._id,
  });

  const label = encodeURIComponent(
    `Smart Hospital:${user.email}`
  );

  const otpauthUrl =
    `otpauth://totp/${label}?secret=${secret}&issuer=Smart%20Hospital`;

  const qrCode = await QRCode.toDataURL(otpauthUrl);

  return res.json({
    success: true,
    secret,
    otpauthUrl,
    qrCode,
  });
};

const verifyMfa = async (req, res) => {
  if (!["doctor", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message:
        "MFA is available only for doctors and administrators",
    });
  }

  const user = await User.findById(req.user.userId).select(
    "+mfa.secret +mfa.pendingSecret"
  );

  const code =
    req.body.code ||
    req.body.totpCode ||
    req.body.otp;

  if (
    !user?.mfa?.pendingSecret ||
    !verifyEncryptedTotp(
      user.mfa.pendingSecret,
      code
    )
  ) {
    await recordAudit({
      req,
      action: "mfa_setup_failed",
      resourceType: "User",
      resourceId: user?._id,
      success: false,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid MFA code",
    });
  }

  user.mfa.secret = user.mfa.pendingSecret;
  user.mfa.pendingSecret = "";
  user.mfa.enabled = true;
  user.mfa.verifiedAt = new Date();

  await user.save();

  await recordAudit({
    req,
    action: "mfa_enabled",
    resourceType: "User",
    resourceId: user._id,
  });

  return res.json({
    success: true,
    message: "MFA enabled",
  });
};

const disableMfa = async (req, res) => {
  if (!["doctor", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message:
        "MFA is available only for doctors and administrators",
    });
  }

  const user = await User.findById(req.user.userId).select(
    "+mfa.secret +mfa.pendingSecret"
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const code =
    req.body.code ||
    req.body.totpCode ||
    req.body.otp;

  const passwordValid = await bcrypt.compare(
    String(req.body.password || ""),
    user.password
  );

  if (
    !user.mfa?.enabled ||
    !passwordValid ||
    !verifyEncryptedTotp(user.mfa.secret, code)
  ) {
    await recordAudit({
      req,
      action: "mfa_disable_failed",
      resourceType: "User",
      resourceId: user._id,
      success: false,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid MFA code",
    });
  }

  user.mfa = {
    enabled: false,
    secret: "",
    pendingSecret: "",
  };

  await user.save();

  await recordAudit({
    req,
    action: "mfa_disabled",
    resourceType: "User",
    resourceId: user._id,
  });

  return res.json({
    success: true,
    message: "MFA disabled",
  });
};

/*
 * Forgot Password
 *
 * Always returns the same success message so that
 * attackers cannot discover whether an email is registered.
 */

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account with this email exists, a password reset link has been sent.",
      });
    }

    // Remove any previous reset token.
    await PasswordResetToken.deleteOne({
      user: user._id,
    });

    // Generate a secure random token.
    const rawToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Only the hash is stored in MongoDB.
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Token expires after 15 minutes.
    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await PasswordResetToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
    });

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const resetUrl =
      `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password - Smart Hospital",
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
                    Password Reset
                  </p>
                </div>

                <div style="padding:28px;">

                  <p style="font-size:16px;color:#0f172a;">
                    Hello ${escapeHtml(user.name)},
                  </p>

                  <p style="font-size:14px;line-height:1.6;color:#475569;">
                    We received a request to reset your Smart Hospital
                    account password.
                  </p>

                  <div style="margin:28px 0;text-align:center;">
                    <a
                      href="${escapeHtml(resetUrl)}"
                      style="
                        display:inline-block;
                        padding:13px 22px;
                        background:#0f172a;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:8px;
                        font-size:14px;
                        font-weight:bold;
                      "
                    >
                      Reset Password
                    </a>
                  </div>

                  <p style="font-size:14px;line-height:1.6;color:#475569;">
                    This link will expire in 15 minutes.
                  </p>

                  <p style="font-size:13px;line-height:1.6;color:#94a3b8;">
                    If you did not request a password reset, you can safely
                    ignore this email.
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
    } catch (emailError) {
      // Do not leave a usable reset token if email delivery failed.
      await PasswordResetToken.deleteOne({
        user: user._id,
      });

      console.error(
        "Password reset email failed:",
        emailError.message
      );

      return res.status(500).json({
        success: false,
        message: "Unable to send password reset email",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account with this email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while processing password reset",
    });
  }
};

/*
 * Reset Password
 */

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetRecord =
      await PasswordResetToken.findOne({
        tokenHash,
        expiresAt: {
          $gt: new Date(),
        },
      });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message:
          "Password reset link is invalid or has expired",
      });
    }

    const user = await User.findById(
      resetRecord.user
    );

    if (!user) {
      await PasswordResetToken.deleteOne({
        _id: resetRecord._id,
      });

      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    user.password = await bcrypt.hash(
      password,
      12
    );

    await user.save();

    await Session.updateMany(
      {
        user: user._id,
        revokedAt: {
          $exists: false,
        },
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );

    // One-time token: invalidate immediately.
    await PasswordResetToken.deleteOne({
      _id: resetRecord._id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resetting password",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  logoutUser,
  refreshSession,
  setupMfa,
  verifyMfa,
  disableMfa,
};