const mongoose = require("mongoose");

const MedicalRecord = require("../models/MedicalRecord");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const { recordAudit } = require("../services/audit.service");

/*
 * =====================================================
 * CREATE MEDICAL RECORD
 * =====================================================
 *
 * Doctor can create a medical record only for a patient
 * who actually has an appointment with that doctor.
 */

const createMedicalRecord = async (
  req,
  res
) => {
  try {
    const {
      patientId,
      appointmentId,
      symptoms,
      diagnosis,
      notes,
      prescription,
      followUpDate,
    } = req.body;

    /*
     * ---------------------------------------------------
     * BASIC VALIDATION
     * ---------------------------------------------------
     */

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        patientId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        appointmentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    /*
     * ---------------------------------------------------
     * FIND DOCTOR
     * ---------------------------------------------------
     */

    const doctor =
      await Doctor.findOne({
        user: req.user.userId,
      });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    /*
     * ---------------------------------------------------
     * FIND PATIENT
     * ---------------------------------------------------
     */

    const patient =
      await Patient.findById(
        patientId
      );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    /*
     * ---------------------------------------------------
     * FIND APPOINTMENT
     * ---------------------------------------------------
     *
     * Appointment must belong to:
     * current doctor + selected patient
     */

    const appointment =
      await Appointment.findOne({
        _id: appointmentId,
        doctor: doctor._id,
        patient: patient._id,
      });

    if (!appointment) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to create a medical record for this patient",
      });
    }

    /*
     * ---------------------------------------------------
     * PREVENT DUPLICATE RECORD
     * ---------------------------------------------------
     *
     * One appointment = one consultation record.
     */

    const existingRecord =
      await MedicalRecord.findOne({
        appointment:
          appointment._id,
      });

    if (existingRecord) {
      return res.status(409).json({
        success: false,
        message:
          "A medical record already exists for this appointment",
        record: existingRecord,
      });
    }

    /*
     * ---------------------------------------------------
     * FOLLOW-UP DATE VALIDATION
     * ---------------------------------------------------
     */

    let normalizedFollowUpDate;

    if (followUpDate) {
      const parsedDate =
        new Date(followUpDate);

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid follow-up date",
        });
      }

      normalizedFollowUpDate =
        parsedDate;
    }

    /*
     * ---------------------------------------------------
     * CREATE RECORD
     * ---------------------------------------------------
     */

    const record =
      await MedicalRecord.create({
        patient: patient._id,

        doctor: doctor._id,

        appointment:
          appointment._id,

        symptoms:
          symptoms?.trim() || "",

        diagnosis:
          diagnosis?.trim() || "",

        notes:
          notes?.trim() || "",

        prescription:
          prescription?.trim() || "",

        followUpDate:
          normalizedFollowUpDate,
      });

    await recordAudit({
      req,
      action: "medical_record_created",
      resourceType: "MedicalRecord",
      resourceId: record._id,
      targetId: patient._id,
      metadata: { appointmentId: appointment._id },
    });

    /*
     * Populate response.
     */

    await record.populate([
      {
        path: "patient",
        populate: {
          path: "user",
          select: "name email",
        },
      },

      {
        path: "doctor",
        populate: {
          path: "user",
          select: "name email",
        },
      },

      {
        path: "appointment",
        select:
          "appointmentDate tokenNumber status reason",
      },
    ]);

    return res.status(201).json({
      success: true,

      message:
        "Medical record created successfully",

      record,
    });
  } catch (error) {
    console.error(
      "Create medical record error:",
      error
    );

    /*
     * Duplicate appointment protection.
     */

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A medical record already exists for this appointment",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating medical record",
    });
  }
};

/*
 * =====================================================
 * GET PATIENT MEDICAL RECORDS
 * =====================================================
 *
 * Doctor can view records only for a patient who has
 * an appointment with that doctor.
 */

const getPatientMedicalRecords =
  async (req, res) => {
    try {
      const {
        patientId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          patientId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid patient ID",
        });
      }

      const doctor =
        await Doctor.findOne({
          user: req.user.userId,
        });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message:
            "Doctor profile not found",
        });
      }

      const patient =
        await Patient.findById(
          patientId
        );

      if (!patient) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found",
        });
      }

      /*
       * Verify doctor-patient relationship.
       */

      const hasAppointment =
        await Appointment.exists({
          doctor: doctor._id,
          patient: patient._id,
        });

      if (!hasAppointment) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to view this patient's medical records",
        });
      }

      const records =
        await MedicalRecord.find({
          doctor: doctor._id,
          patient: patient._id,
        })
          .populate({
            path: "doctor",
            populate: {
              path: "user",
              select:
                "name email",
            },
          })
          .populate({
            path: "appointment",
            select:
              "appointmentDate tokenNumber status reason",
          })
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,

        count: records.length,

        records,
      });
    } catch (error) {
      console.error(
        "Get patient medical records error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching medical records",
      });
    }
  };

/*
 * =====================================================
 * GET MY MEDICAL RECORDS
 * =====================================================
 *
 * Patient can view ONLY their own medical records.
 */

const getMyMedicalRecords =
  async (req, res) => {
    try {
      const patient =
        await Patient.findOne({
          user: req.user.userId,
        });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message:
            "Patient profile not found",
        });
      }

      const records =
        await MedicalRecord.find({
          patient: patient._id,
        })
          .populate({
            path: "doctor",
            populate: {
              path: "user",
              select:
                "name email",
            },
          })
          .populate({
            path: "appointment",
            select:
              "appointmentDate tokenNumber status reason",
          })
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,

        count: records.length,

        records,
      });
    } catch (error) {
      console.error(
        "Get my medical records error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching medical history",
      });
    }
  };

/*
 * =====================================================
 * GET SINGLE MEDICAL RECORD
 * =====================================================
 */

const getMedicalRecordById =
  async (req, res) => {
    try {
      const {
        recordId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          recordId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid medical record ID",
        });
      }

      const doctor =
        await Doctor.findOne({
          user: req.user.userId,
        });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message:
            "Doctor profile not found",
        });
      }

      const record =
        await MedicalRecord.findOne({
          _id: recordId,
          doctor: doctor._id,
        })
          .populate({
            path: "patient",
            populate: {
              path: "user",
              select:
                "name email",
            },
          })
          .populate({
            path: "doctor",
            populate: {
              path: "user",
              select:
                "name email",
            },
          })
          .populate({
            path: "appointment",
            select:
              "appointmentDate tokenNumber status reason",
          });

      if (!record) {
        return res.status(404).json({
          success: false,
          message:
            "Medical record not found",
        });
      }

      return res.status(200).json({
        success: true,
        record,
      });
    } catch (error) {
      console.error(
        "Get medical record error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching medical record",
      });
    }
  };

module.exports = {
  createMedicalRecord,
  getPatientMedicalRecords,
  getMyMedicalRecords,
  getMedicalRecordById,
};