const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  body,
  param,
  validationResult,
} = require("express-validator");

const {
  createAppointment,
  getMyAppointments,
  clearMyAppointmentHistory,
  completeAppointment,
  cancelAppointment,
} = require("../controllers/appointment.controller");

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

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
 * Appointment booking
 *
 * Prevents automated appointment spam.
 */
const appointmentBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many appointment booking requests. Please try again later.",
  },
});

/*
 * Appointment actions
 *
 * Protects complete/cancel endpoints from abuse.
 */
const appointmentActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many appointment requests. Please try again later.",
  },
});

/*
 * =====================================================
 * GET MY APPOINTMENTS
 * =====================================================
 */

router.get(
  "/my",

  protect,

  authorizeRoles("patient"),

  getMyAppointments
);

/*
 * =====================================================
 * CLEAR MY APPOINTMENT HISTORY (PATIENT VIEW ONLY)
 * =====================================================
 */

router.patch(
  "/my/history/clear",

  protect,

  authorizeRoles("patient"),

  appointmentActionLimiter,

  clearMyAppointmentHistory
);

/*
 * =====================================================
 * CREATE APPOINTMENT
 * =====================================================
 */

router.post(
  "/",

  protect,

  authorizeRoles("patient"),

  appointmentBookingLimiter,

  body("doctorId")
    .trim()
    .notEmpty()
    .withMessage("Doctor ID is required")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  body("appointmentDate")
    .notEmpty()
    .withMessage("Appointment date is required")
    .isISO8601()
    .withMessage("Invalid appointment date")
    .custom((value) => {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        throw new Error("Invalid appointment date");
      }

      return true;
    }),

  body("reason")
    .optional({ nullable: true })
    .isString()
    .withMessage("Reason must be a string")
    .trim()
    .isLength({
      max: 500,
    })
    .withMessage(
      "Reason cannot exceed 500 characters"
    ),

  handleValidationErrors,

  createAppointment
);

/*
 * =====================================================
 * COMPLETE APPOINTMENT
 * =====================================================
 */

router.patch(
  "/:appointmentId/complete",

  protect,

  authorizeRoles("doctor"),

  appointmentActionLimiter,

  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  handleValidationErrors,

  completeAppointment
);

/*
 * =====================================================
 * CANCEL APPOINTMENT
 * =====================================================
 */

router.patch(
  "/:appointmentId/cancel",

  protect,

  authorizeRoles("patient"),

  appointmentActionLimiter,

  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  handleValidationErrors,

  cancelAppointment
);

module.exports = router;