const Patient = require("../models/Patient");
const cloudinary = require("../config/cloudinary");

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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required.",
      });
    }

    const patient = await Patient.findOne({ user: req.user.userId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found.",
      });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "smart-hospital/patients",
          resource_type: "image",
          transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    if (!uploadResult?.secure_url || !uploadResult?.public_id) {
      return res.status(500).json({
        success: false,
        message: "Cloudinary upload failed.",
      });
    }

    const previousPublicId = patient.profilePicturePublicId;

    patient.profilePicture = uploadResult.secure_url;
    patient.profilePicturePublicId = uploadResult.public_id;
    await patient.save();

    // Best-effort cleanup of the old image after the new image is persisted.
    if (
      previousPublicId &&
      previousPublicId !== uploadResult.public_id
    ) {
      try {
        await cloudinary.uploader.destroy(previousPublicId);
      } catch (deleteError) {
        console.error("Previous patient image cleanup failed:", deleteError);
      }
    }

    const updatedPatient = await Patient.findOne({
      user: req.user.userId,
    }).populate("user", "name email role");

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully.",
      patient: updatedPatient,
    });
  } catch (error) {
    console.error("Upload patient profile picture error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while uploading profile picture.",
    });
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user.userId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found.",
      });
    }

    if (patient.profilePicturePublicId) {
      try {
        await cloudinary.uploader.destroy(
          patient.profilePicturePublicId
        );
      } catch (cloudinaryError) {
        console.error("Patient Cloudinary delete error:", cloudinaryError);
        return res.status(502).json({
          success: false,
          message: "Unable to remove the profile picture from image storage.",
        });
      }
    }

    patient.profilePicture = null;
    patient.profilePicturePublicId = null;
    await patient.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully.",
    });
  } catch (error) {
    console.error("Delete patient profile picture error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while removing profile picture.",
    });
  }
};

const clearPatientHistory = async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { user: req.user.userId },
      { $set: { historyClearedAt: new Date() } },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Appointment history cleared from your personal view. Hospital records are retained.",
      historyClearedAt: patient.historyClearedAt,
    });
  } catch (error) {
    console.error("Clear patient history error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while clearing appointment history.",
    });
  }
};

module.exports = {
  createPatientProfile,
  getPatientProfile,
  updatePatientProfile,
  uploadProfilePicture,
  deleteProfilePicture,
  clearPatientHistory,
};