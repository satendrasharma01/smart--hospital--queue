const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  body,
  validationResult,
} = require("express-validator");

const {
  createPatientProfile,
  getPatientProfile,
  updatePatientProfile,
  uploadProfilePicture,
} = require("../controllers/patient.controller");

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const uploadPatientProfilePicture = require(
  "../middleware/upload.middleware"
);

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
 * Profile creation
 */
const createProfileLimiter = rateLimit({
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

/*
 * Profile updates
 */
const updateProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many profile update requests. Please try again later.",
  },
});

/*
 * =====================================================
 * CREATE PATIENT PROFILE
 * =====================================================
 */

router.post(
  "/profile",

  protect,

  authorizeRoles("patient"),

  createProfileLimiter,

  body("phone")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage("Phone number must be a string")
    .trim()
    .isLength({
      max: 20,
    })
    .withMessage(
      "Phone number cannot exceed 20 characters"
    ),

  body("dateOfBirth")
    .optional({
      nullable: true,
    })
    .isISO8601()
    .withMessage("Invalid date of birth"),

  body("gender")
    .optional({
      nullable: true,
    })
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender"),

  body("bloodGroup")
    .optional({
      nullable: true,
    })
    .isIn([
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
      "O+",
      "O-",
    ])
    .withMessage("Invalid blood group"),

  body("address")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage("Address must be a string")
    .trim()
    .isLength({
      max: 300,
    })
    .withMessage(
      "Address cannot exceed 300 characters"
    ),

  handleValidationErrors,

  createPatientProfile
);

/*
 * =====================================================
 * GET PATIENT PROFILE
 * =====================================================
 */

router.get(
  "/profile",

  protect,

  authorizeRoles("patient"),

  getPatientProfile
);

/*
 * =====================================================
 * UPLOAD PROFILE PICTURE
 * =====================================================
 */

router.patch(
  "/profile/picture",

  protect,

  authorizeRoles("patient"),

  uploadPatientProfilePicture.single(
    "profilePicture"
  ),

  uploadProfilePicture
);

/*
 * =====================================================
 * UPDATE PATIENT PROFILE
 * =====================================================
 */

router.patch(
  "/profile",

  protect,

  authorizeRoles("patient"),

  updateProfileLimiter,

  body("phone")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage("Phone number must be a string")
    .trim()
    .isLength({
      max: 20,
    })
    .withMessage(
      "Phone number cannot exceed 20 characters"
    ),

  body("dateOfBirth")
    .optional({
      nullable: true,
    })
    .isISO8601()
    .withMessage("Invalid date of birth"),

  body("gender")
    .optional({
      nullable: true,
    })
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender"),

  body("bloodGroup")
    .optional({
      nullable: true,
    })
    .isIn([
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
      "O+",
      "O-",
    ])
    .withMessage("Invalid blood group"),

  body("address")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage("Address must be a string")
    .trim()
    .isLength({
      max: 300,
    })
    .withMessage(
      "Address cannot exceed 300 characters"
    ),

  handleValidationErrors,

  updatePatientProfile
);

module.exports = router;