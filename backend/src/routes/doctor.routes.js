const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  body,
  param,
  query,
  validationResult,
} = require("express-validator");

const {
  createDoctorProfile,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctors,
  getTodayQueue,
  getDoctorById,
  getDoctorAvailability,
  getMyPatients,
  getPatientDetails,
  uploadDoctorProfileImage,
  deleteDoctorProfileImage,
} = require("../controllers/doctor.controller");

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

// IMPORTANT:
// Doctor image upload uses multer memoryStorage()
// because doctor.controller.js uses req.file.buffer.
const upload = require("../middleware/doctorUpload.middleware");

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

      errors: errors.array().map(
        (error) => ({
          field: error.path,
          message: error.msg,
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

const doctorProfileLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many profile creation attempts. Please try again later.",
    },
  });

const doctorSearchLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many doctor search requests. Please try again later.",
    },
  });

const patientDetailsLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many patient detail requests. Please try again later.",
    },
  });

/*
 * =====================================================
 * GET ALL DOCTORS
 * =====================================================
 */

router.get(
  "/",

  doctorSearchLimiter,

  query("department")
    .optional()
    .trim()
    .isMongoId()
    .withMessage(
      "Invalid department ID"
    ),

  query("specialization")
    .optional()
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      "Specialization search cannot exceed 100 characters"
    ),

  query("search")
    .optional()
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      "Doctor search cannot exceed 100 characters"
    ),

  handleValidationErrors,

  getDoctors
);

/*
 * =====================================================
 * CREATE DOCTOR PROFILE
 * =====================================================
 */

router.post(
  "/profile",

  protect,

  authorizeRoles("doctor"),

  doctorProfileLimiter,

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

  body("bio")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage("Bio must be a string")
    .trim()
    .isLength({
      max: 2000,
    })
    .withMessage("Bio cannot exceed 2000 characters"),

  body("experience")
    .optional({
      nullable: true,
    })
    .isNumeric()
    .withMessage(
      "Experience must be a number"
    )
    .custom((value) => {
      const number = Number(value);

      if (
        number < 0 ||
        number > 80
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
      const number = Number(value);

      if (
        number < 0 ||
        number > 1000000
      ) {
        throw new Error(
          "Consultation fee must be between 0 and 1000000"
        );
      }

      return true;
    }),

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

      const trimmed =
        value.trim();

      if (!trimmed) {
        throw new Error(
          "Department is required"
        );
      }

      if (
        trimmed.length > 100
      ) {
        throw new Error(
          "Department cannot exceed 100 characters"
        );
      }

      return true;
    }),

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

  handleValidationErrors,

  createDoctorProfile
);

/*
 * =====================================================
 * GET MY DOCTOR PROFILE
 * =====================================================
 */

router.get(
  "/profile",

  protect,

  authorizeRoles("doctor"),

  getDoctorProfile
);

/*
 * =====================================================
 * UPDATE DOCTOR PROFILE
 * =====================================================
 */

router.patch(
  "/profile",

  protect,

  authorizeRoles("doctor"),

  body("name")
    .optional()
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Name must be between 2 and 100 characters"
    ),

  body("specialization")
    .optional()
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Specialization must be between 2 and 100 characters"
    ),

  body("qualification")
    .optional()
    .trim()
    .isLength({
      min: 2,
      max: 150,
    })
    .withMessage(
      "Qualification must be between 2 and 150 characters"
    ),

  body("bio")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage("Bio must be a string")
    .trim()
    .isLength({
      max: 2000,
    })
    .withMessage("Bio cannot exceed 2000 characters"),

  body("experience")
    .optional()
    .isNumeric()
    .withMessage(
      "Experience must be a number"
    ),

  body("consultationFee")
    .optional()
    .isNumeric()
    .withMessage(
      "Consultation fee must be a number"
    ),

  body("profileImage")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Profile image must be a string"
    )
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Profile image URL is too long"
    ),

  handleValidationErrors,

  updateDoctorProfile
);

/*
 * =====================================================
 * UPLOAD DOCTOR PROFILE IMAGE
 *
 * IMPORTANT:
 * This route MUST stay before "/:doctorId".
 *
 * Field name:
 * profileImage
 * =====================================================
 */

router.post(
  "/profile/image",

  protect,

  authorizeRoles("doctor"),

  upload.single("profileImage"),

  uploadDoctorProfileImage
);

/*
 * =====================================================
 * DELETE DOCTOR PROFILE IMAGE
 *
 * IMPORTANT:
 * This route MUST stay before "/:doctorId".
 * =====================================================
 */

router.delete(
  "/profile/image",

  protect,

  authorizeRoles("doctor"),

  deleteDoctorProfileImage
);

/*
 * =====================================================
 * GET TODAY'S QUEUE
 * =====================================================
 */

router.get(
  "/queue/today",

  protect,

  authorizeRoles("doctor"),

  getTodayQueue
);

/*
 * =====================================================
 * GET MY PATIENTS
 * =====================================================
 *
 * IMPORTANT:
 * This route MUST stay before "/:doctorId".
 * =====================================================
 */

router.get(
  "/patients",

  protect,

  authorizeRoles("doctor"),

  patientDetailsLimiter,

  getMyPatients
);

/*
 * =====================================================
 * GET PATIENT DETAILS
 *
 * IMPORTANT:
 * This route MUST stay before "/:doctorId".
 * =====================================================
 */

router.get(
  "/patients/:patientId",

  protect,

  authorizeRoles("doctor"),

  patientDetailsLimiter,

  param("patientId")
    .isMongoId()
    .withMessage(
      "Invalid patient ID"
    ),

  handleValidationErrors,

  getPatientDetails
);

/*
 * =====================================================
 * GET DOCTOR AVAILABILITY
 *
 * IMPORTANT:
 * This route MUST be before "/:doctorId".
 * =====================================================
 */

router.get(
  "/:doctorId/availability",

  protect,

  authorizeRoles("patient"),

  param("doctorId")
    .isMongoId()
    .withMessage(
      "Invalid doctor ID"
    ),

  handleValidationErrors,

  getDoctorAvailability
);

/*
 * =====================================================
 * GET DOCTOR BY ID
 * =====================================================
 */

router.get(
  "/:doctorId",

  protect,

  authorizeRoles("patient"),

  param("doctorId")
    .isMongoId()
    .withMessage(
      "Invalid doctor ID"
    ),

  handleValidationErrors,

  getDoctorById
);

module.exports = router;