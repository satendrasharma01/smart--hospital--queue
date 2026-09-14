const Patient = require("../models/Patient");

const createPatientProfile = async (req, res) => {
  try {
    const { phone, dateOfBirth, gender, bloodGroup, address } = req.body;

    const existingProfile = await Patient.findOne({
      user: req.user.userId,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Patient profile already exists",
      });
    }

    const patient = await Patient.create({
      user: req.user.userId,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
    });

    res.status(201).json({
      success: true,
      message: "Patient profile created successfully",
      patient,
    });
  } catch (error) {
    console.error("Create patient profile error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating patient profile",
    });
  }
};

const getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      user: req.user.userId,
    }).populate("user", "name email role");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    res.status(200).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("Get patient profile error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching patient profile",
    });
  }
};

const updatePatientProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      "phone",
      "dateOfBirth",
      "gender",
      "bloodGroup",
      "address",
    ];

    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const patient = await Patient.findOneAndUpdate(
      {
        user: req.user.userId,
      },
      updates,
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).populate("user", "name email role");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient profile updated successfully",
      patient,
    });
  } catch (error) {
    console.error("Update patient profile error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating patient profile",
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    console.log("==========================================");
    console.log("PROFILE PICTURE UPLOAD STARTED");
    console.log("User ID:", req.user?.userId);
    console.log("File received:", req.file);
    console.log("==========================================");

    if (!req.file) {
      console.error("UPLOAD ERROR: req.file is missing");

      return res.status(400).json({
        success: false,
        message:
          "No profile picture received. Make sure the field name is 'profilePicture'.",
      });
    }

    console.log("Cloudinary upload successful");
    console.log("Cloudinary URL:", req.file.path);
    console.log("Cloudinary public ID:", req.file.filename);

    const patient = await Patient.findOneAndUpdate(
      {
        user: req.user.userId,
      },
      {
        profilePicture: req.file.path,
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).populate("user", "name email role");

    if (!patient) {
      console.error(
        "DATABASE ERROR: Patient profile not found for user:",
        req.user.userId
      );

      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    console.log("Profile picture saved in database");
    console.log("Profile picture URL:", patient.profilePicture);
    console.log("PROFILE PICTURE UPLOAD SUCCESS");
    console.log("==========================================");

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully.",
      patient,
    });
  } catch (error) {
    console.error("==========================================");
    console.error("PROFILE PICTURE UPLOAD FAILED");
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error details:", error);
    console.error("Stack:", error?.stack);
    console.error("==========================================");

    return res.status(500).json({
      success: false,
      message: "Server error while uploading profile picture.",
    });
  }
};

module.exports = {
  createPatientProfile,
  getPatientProfile,
  updatePatientProfile,
  uploadProfilePicture,
};