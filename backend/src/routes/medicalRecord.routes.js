const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  body,
  param,
  validationResult,
} = require("express-validator");

const {
  createMedicalRecord,
  getPatientMedicalRecords,
  getMyMedicalRecords,
  getMedicalRecordById,
} = require("../controllers/medicalRecord.controller");

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

const createRecordLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 30,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,

      message:
        "Too many medical record requests. Please try again later.",
    },
  });

const readRecordLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 100,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,

      message:
        "Too many medical record requests. Please try again later.",
    },
  });

/*
 * =====================================================
 * CREATE MEDICAL RECORD
 * =====================================================
 */

router.post(
  "/",

  protect,

  authorizeRoles("doctor"),

  createRecordLimiter,

  body("patientId")
    .notEmpty()
    .withMessage(
      "Patient ID is required"
    )
    .isMongoId()
    .withMessage(
      "Invalid patient ID"
    ),

  body("appointmentId")
    .notEmpty()
    .withMessage(
      "Appointment ID is required"
    )
    .isMongoId()
    .withMessage(
      "Invalid appointment ID"
    ),

  body("symptoms")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Symptoms must be text"
    )
    .trim()
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Symptoms cannot exceed 2000 characters"
    ),

  body("diagnosis")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Diagnosis must be text"
    )
    .trim()
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Diagnosis cannot exceed 2000 characters"
    ),

  body("notes")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Notes must be text"
    )
    .trim()
    .isLength({
      max: 5000,
    })
    .withMessage(
      "Notes cannot exceed 5000 characters"
    ),

  body("prescription")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Prescription must be text"
    )
    .trim()
    .isLength({
      max: 5000,
    })
    .withMessage(
      "Prescription cannot exceed 5000 characters"
    ),

  body("followUpDate")
    .optional({
      nullable: true,
    })
    .isISO8601()
    .withMessage(
      "Follow-up date must be a valid date"
    ),

  handleValidationErrors,

  createMedicalRecord
);

/*
 * =====================================================
 * GET MY MEDICAL RECORDS
 * =====================================================
 *
 * IMPORTANT:
 * This route MUST stay before "/:recordId".
 *
 * Patient can access ONLY their own records.
 * =====================================================
 */

router.get(
  "/my",

  protect,

  authorizeRoles("patient"),

  readRecordLimiter,

  getMyMedicalRecords
);

/*
 * =====================================================
 * GET PATIENT MEDICAL RECORDS
 * =====================================================
 *
 * Doctor only.
 * =====================================================
 */

router.get(
  "/patient/:patientId",

  protect,

  authorizeRoles("doctor"),

  readRecordLimiter,

  param("patientId")
    .isMongoId()
    .withMessage(
      "Invalid patient ID"
    ),

  handleValidationErrors,

  getPatientMedicalRecords
);

/*
 * =====================================================
 * GET SINGLE MEDICAL RECORD
 * =====================================================
 *
 * IMPORTANT:
 * Keep this AFTER "/my".
 * =====================================================
 */

router.get(
  "/:recordId",

  protect,

  authorizeRoles("doctor"),

  readRecordLimiter,

  param("recordId")
    .isMongoId()
    .withMessage(
      "Invalid medical record ID"
    ),

  handleValidationErrors,

  getMedicalRecordById
);

module.exports = router;