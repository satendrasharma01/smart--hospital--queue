const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  param,
  validationResult,
} = require("express-validator");

const {
  callNextPatient,
  completeAppointment,
  getMyQueueStatus,
} = require("../controllers/queue.controller");

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

const callNextLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    max: 10,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success: false,

      message:
        "Too many queue actions. Please wait a moment and try again.",
    },
  });

const completeLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    max: 20,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success: false,

      message:
        "Too many completion requests. Please try again later.",
    },
  });

/*
 * =====================================================
 * CALL NEXT PATIENT
 * =====================================================
 */



router.patch(
  "/next",

  protect,

  authorizeRoles(
    "doctor"
  ),

  callNextLimiter,

  callNextPatient
);

/*
 * =====================================================
 * COMPLETE APPOINTMENT
 * =====================================================
 */

router.patch(
  "/:appointmentId/complete",

  protect,

  authorizeRoles(
    "doctor"
  ),

  completeLimiter,

  param(
    "appointmentId"
  )
    .isMongoId()
    .withMessage(
      "Invalid appointment ID"
    ),

  handleValidationErrors,

  completeAppointment
);

/*
 * =====================================================
 * PATIENT QUEUE STATUS
 * =====================================================
 */

router.get(
  "/my-status",

  protect,

  authorizeRoles(
    "patient"
  ),

  getMyQueueStatus
);

module.exports = router;