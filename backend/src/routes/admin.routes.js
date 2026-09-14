const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  body,
  param,
  validationResult,
} = require("express-validator");

const {
  createDoctor,
  getAdminDashboard,
  getAdminPatients,
  getAdminAppointments,
  testEmail,
  updateDoctorLifecycle,
} = require("../controllers/admin.controller");

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

const createDoctorLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many doctor creation requests. Please try again later.",
    },
  });

const testEmailLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many email test requests. Please try again later.",
    },
  });

/*
 * =====================================================
 * ADMIN DASHBOARD
 * =====================================================
 */

router.get(
  "/dashboard",

  protect,

  authorizeRoles("admin"),

  getAdminDashboard
);

/*
 * =====================================================
 * CREATE DOCTOR
 * =====================================================
 */

router.post(
  "/doctors",

  protect,

  authorizeRoles("admin"),

  createDoctorLimiter,

  /*
   * Basic account validation
   */
  body("name")
    .trim()
    .notEmpty()
    .withMessage(
      "Doctor name is required"
    )
    .isLength({
      min: 2,
      max: 50,
    })
    .withMessage(
      "Doctor name must be between 2 and 50 characters"
    ),

  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage(
      "Please provide a valid doctor email"
    ),

  body("password")
    .isString()
    .isLength({
      min: 6,
      max: 128,
    })
    .withMessage(
      "Password must be between 6 and 128 characters"
    ),

  /*
   * Doctor profile validation
   */
  body("specialization")
    .trim()
    .notEmpty()
    .withMessage(
      "Specialization is required"
    )
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Specialization must be between 2 and 100 characters"
    ),

  body("qualification")
    .trim()
    .notEmpty()
    .withMessage(
      "Qualification is required"
    )
    .isLength({
      min: 2,
      max: 150,
    })
    .withMessage(
      "Qualification must be between 2 and 150 characters"
    ),

  body("experience")
    .optional({
      nullable: true,
    })
    .isNumeric()
    .withMessage(
      "Experience must be a number"
    )
    .custom((value) => {
      const experience =
        Number(value);

      if (
        experience < 0 ||
        experience > 80
      ) {
        throw new Error(
          "Experience must be between 0 and 80 years"
        );
      }

      return true;
    }),

  body("consultationFee")
    .optional({
      nullable: true,
    })
    .isNumeric()
    .withMessage(
      "Consultation fee must be a number"
    )
    .custom((value) => {
      const fee = Number(value);

      if (
        fee < 0 ||
        fee > 1000000
      ) {
        throw new Error(
          "Consultation fee must be between 0 and 1000000"
        );
      }

      return true;
    }),

  /*
   * Department remains an ObjectId/name
   * compatible string as in the existing system.
   */
  body("department")
    .notEmpty()
    .withMessage(
      "Department is required"
    )
    .custom((value) => {
      if (typeof value !== "string") {
        throw new Error(
          "Invalid department"
        );
      }

      const department =
        value.trim();

      if (!department) {
        throw new Error(
          "Department is required"
        );
      }

      if (department.length > 100) {
        throw new Error(
          "Department cannot exceed 100 characters"
        );
      }

      return true;
    }),

  /*
   * Existing availableDays
   */
  body("availableDays")
    .optional({
      nullable: true,
    })
    .isArray()
    .withMessage(
      "Available days must be an array"
    ),

  body("availableDays.*")
    .optional()
    .isString()
    .withMessage(
      "Each available day must be a string"
    )
    .trim()
    .isLength({
      min: 2,
      max: 20,
    })
    .withMessage(
      "Invalid available day"
    ),

  /*
   * New availability schedule
   */
  body("availability")
    .optional({
      nullable: true,
    })
    .isArray()
    .withMessage(
      "Availability must be an array"
    ),

  body("availability.*.dayOfWeek")
    .optional()
    .isString()
    .withMessage(
      "Availability day must be a string"
    )
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
      "Invalid availability day"
    ),

  body("availability.*.startTime")
    .optional()
    .matches(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    )
    .withMessage(
      "Start time must use HH:mm format"
    ),

  body("availability.*.endTime")
    .optional()
    .matches(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    )
    .withMessage(
      "End time must use HH:mm format"
    ),

  body("availability.*.slotDuration")
    .optional()
    .isInt({
      min: 5,
      max: 120,
    })
    .withMessage(
      "Slot duration must be between 5 and 120 minutes"
    ),

  body("availability.*.isActive")
    .optional()
    .isBoolean()
    .withMessage(
      "isActive must be a boolean"
    ),

  handleValidationErrors,

  createDoctor
);

router.patch(
  "/doctors/:doctorId/lifecycle",
  protect,
  authorizeRoles("admin"),
  param("doctorId")
    .isMongoId()
    .withMessage("Invalid doctor ID"),
  body("lifecycleStatus")
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Invalid lifecycle status"),
  handleValidationErrors,
  updateDoctorLifecycle
);

/*
 * =====================================================
 * GET ALL PATIENTS
 * =====================================================
 */

router.get(
  "/patients",

  protect,

  authorizeRoles("admin"),

  getAdminPatients
);

/*
 * =====================================================
 * GET ALL APPOINTMENTS
 * =====================================================
 */

router.get(
  "/appointments",

  protect,

  authorizeRoles("admin"),

  getAdminAppointments
);

/*
 * =====================================================
 * TEST EMAIL
 * =====================================================
 */

router.post(
  "/test-email",

  protect,

  authorizeRoles("admin"),

  testEmailLimiter,

  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage(
      "Please provide a valid email address"
    ),

  handleValidationErrors,

  testEmail
);

module.exports = router;