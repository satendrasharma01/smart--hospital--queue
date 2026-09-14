const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  body,
  validationResult,
} = require("express-validator");

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  logoutUser,
  refreshSession,
  setupMfa,
  verifyMfa,
  disableMfa,
} = require("../controllers/auth.controller");
const protect = require("../middleware/auth.middleware");

const router = express.Router();

/*
 * =====================================================
 * VALIDATION ERROR HANDLER
 * =====================================================
 */

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
};

/*
 * =====================================================
 * RATE LIMITERS
 * =====================================================
 */

/*
 * Registration
 * Maximum 10 attempts per 15 minutes.
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many registration attempts. Please try again later.",
  },
});

/*
 * Login
 * Maximum 10 attempts per 15 minutes.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  message: {
    success: false,
    message:
      "Too many login attempts. Please try again later.",
  },
});

/*
 * Forgot Password
 * Maximum 5 attempts per 15 minutes.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many password reset requests. Please try again later.",
  },
});

/*
 * Reset Password
 * Maximum 10 attempts per 15 minutes.
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many password reset attempts. Please try again later.",
  },
});
const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many MFA attempts. Please try again later." },
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many refresh attempts. Please try again later." },
});

/*
 * =====================================================
 * REGISTER
 * =====================================================
 */

router.post(
  "/register",

  registerLimiter,

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({
      min: 2,
      max: 50,
    })
    .withMessage(
      "Name must be between 2 and 50 characters"
    ),

  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .isString()
    .isLength({
      min: 6,
      max: 128,
    })
    .withMessage(
      "Password must be between 6 and 128 characters"
    ),

  handleValidationErrors,

  registerUser
);

router.post("/logout", logoutUser);
router.post("/refresh", refreshLimiter, refreshSession);
router.post("/mfa/setup", protect, mfaLimiter, setupMfa);
router.post("/mfa/verify", protect, mfaLimiter, verifyMfa);
router.post("/mfa/disable", protect, mfaLimiter, disableMfa);

/*
 * =====================================================
 * LOGIN
 * =====================================================
 */

router.post(
  "/login",

  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .isString()
    .notEmpty()
    .withMessage("Password is required"),

  handleValidationErrors,

  loginLimiter,

  loginUser
);

/*
 * =====================================================
 * FORGOT PASSWORD
 * =====================================================
 */

router.post(
  "/forgot-password",

  forgotPasswordLimiter,

  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Please provide a valid email address"),

  handleValidationErrors,

  forgotPassword
);

/*
 * =====================================================
 * RESET PASSWORD
 * =====================================================
 */

router.post(
  "/reset-password",

  resetPasswordLimiter,

  body("token")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required"),

  body("password")
    .isString()
    .isLength({
      min: 6,
      max: 128,
    })
    .withMessage(
      "Password must be between 6 and 128 characters"
    ),

  handleValidationErrors,

  resetPassword
);

/*
 * =====================================================
 * EXPORT
 * =====================================================
 */

module.exports = router;