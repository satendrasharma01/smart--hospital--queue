const multer = require("multer");

const storage = multer.memoryStorage();

const uploadPatientProfilePicture = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG and WebP images are allowed."),
        false
      );
    }

    cb(null, true);
  },
});

module.exports = uploadPatientProfilePicture;
