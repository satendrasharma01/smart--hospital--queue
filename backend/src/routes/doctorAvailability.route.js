const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  body,
  param,
  validationResult,
} = require("express-validator");

const {
  createAvailability,
  getMyAvailability,
  getDoctorAvailabilityForPatient,
  deleteAvailability,
} = require("../controllers/doctorAvailability.controller");

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const router = express.Router();

/*
 * =====================================================
 * VALIDATION ERROR HANDLER
 * =====================================================
 */

const handleValidationErrors = (
  req,
  res,
  next
) => {
  const errors =
    validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,

      message:
        "Validation failed",

      errors:
        errors.array().map(
          (error) => ({
            field:
              error.path,

            message:
              error.msg,
          })
        ),
    });
  }

  next();
};

/*
 * =====================================================
 * RATE LIMITERS
 * =====================================================
 */

const availabilityWriteLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 30,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success: false,

      message:
        "Too many availability update requests. Please try again later.",
    },
  });

const availabilityReadLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 100,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success: false,

      message:
        "Too many availability requests. Please try again later.",
    },
  });

/*
 * =====================================================
 * CREATE AVAILABILITY
 *
 * DOCTOR ONLY
 *
 * POST /
 * =====================================================
 */

router.post(
  "/",

  protect,

  authorizeRoles(
    "doctor"
  ),

  availabilityWriteLimiter,

  body("dayOfWeek")
    .trim()
    .toLowerCase()
    .isIn([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ])
    .withMessage(
      "Invalid day of week"
    ),

  body("startTime")
    .trim()
    .matches(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    )
    .withMessage(
      "Start time must be in HH:MM format"
    ),

  body("endTime")
    .trim()
    .matches(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    )
    .withMessage(
      "End time must be in HH:MM format"
    ),

  body("slotDuration")
    .isInt({
      min: 5,
      max: 120,
    })
    .withMessage(
      "Slot duration must be between 5 and 120 minutes"
    ),

  handleValidationErrors,

  createAvailability
);

/*
 * =====================================================
 * GET MY AVAILABILITY
 *
 * DOCTOR ONLY
 *
 * GET /my
 *
 * IMPORTANT:
 * This MUST come before /:doctorId.
 * =====================================================
 */

router.get(
  "/my",

  protect,

  authorizeRoles(
    "doctor"
  ),

  availabilityReadLimiter,

  getMyAvailability
);

/*
 * =====================================================
 * GET DOCTOR AVAILABILITY FOR PATIENT
 *
 * PATIENT ONLY
 *
 * GET /:doctorId
 *
 * Returns:
 *
 * availability
 * slots
 * bookedSlots
 * =====================================================
 */

router.get(
  "/:doctorId",

  protect,

  authorizeRoles(
    "patient"
  ),

  availabilityReadLimiter,

  param("doctorId")
    .isMongoId()
    .withMessage(
      "Invalid doctor ID"
    ),

  handleValidationErrors,

  getDoctorAvailabilityForPatient
);

/*
 * =====================================================
 * DELETE AVAILABILITY
 *
 * DOCTOR ONLY
 *
 * DELETE /:availabilityId
 *
 * =====================================================
 */

router.delete(
  "/:availabilityId",

  protect,

  authorizeRoles(
    "doctor"
  ),

  availabilityWriteLimiter,

  param(
    "availabilityId"
  )
    .isMongoId()
    .withMessage(
      "Invalid availability ID"
    ),

  handleValidationErrors,

  deleteAvailability
);

module.exports = router;