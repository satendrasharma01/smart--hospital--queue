const mongoose = require("mongoose");

const Doctor = require("../models/Doctor");
const DoctorAvailability = require("../models/DoctorAvailability");
const Department = require("../models/Department");
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const { recordAudit } = require("../services/audit.service");

const {
  getHospitalStartOfDay,
} = require("../utils/dateTime");

/*
 * =====================================================
 * CREATE DOCTOR PROFILE
 * =====================================================
 */

const createDoctorProfile = async (req, res) => {
  try {
    const {
      specialization,
      qualification,
      bio,
      experience,
      consultationFee,
      department,
      availableDays,
    } = req.body;

    const user = await User.findById(
      req.user.userId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can create doctor profile",
      });
    }

    if (
      bio !== undefined &&
      bio !== null &&
      typeof bio !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Bio must be a string",
      });
    }

    const existingDoctor =
      await Doctor.findOne({
        user: user._id,
      });

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message:
          "Doctor profile already exists",
      });
    }

    let departmentId = null;

    if (
      mongoose.Types.ObjectId.isValid(
        department
      )
    ) {
      const departmentExists =
        await Department.findById(
          department
        );

      if (!departmentExists) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }

      departmentId =
        departmentExists._id;
    } else {
      const departmentDoc =
        await Department.findOne({
          name: {
            $regex: `^${String(
              department
            ).trim()}$`,
            $options: "i",
          },
        });

      if (!departmentDoc) {
        return res.status(404).json({
          success: false,
          message:
            "Department not found",
        });
      }

      departmentId =
        departmentDoc._id;
    }

    const doctor =
      await Doctor.create({
        user: user._id,

        specialization:
          specialization.trim(),

        qualification:
          qualification.trim(),

        bio:
          bio === undefined ||
          bio === null
            ? ""
            : bio,

        experience:
          experience !== undefined &&
          experience !== null &&
          experience !== ""
            ? Number(experience)
            : 0,

        consultationFee:
          consultationFee !==
            undefined &&
          consultationFee !== null &&
          consultationFee !== ""
            ? Number(consultationFee)
            : 0,

        department: departmentId,

        availableDays:
          Array.isArray(
            availableDays
          )
            ? availableDays
            : [],
      });

    const populatedDoctor =
      await Doctor.findById(
        doctor._id
      )
        .populate(
          "user",
          "name email role profileImage"
        )
        .populate(
          "department",
          "name description"
        );

    return res.status(201).json({
      success: true,

      message:
        "Doctor profile created successfully",

      doctor: populatedDoctor,
    });
  } catch (error) {
    console.error(
      "Create doctor profile error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while creating doctor profile",
    });
  }
};

/*
 * =====================================================
 * GET MY DOCTOR PROFILE
 * =====================================================
 */

const getDoctorProfile = async (
  req,
  res
) => {
  try {
    const doctor =
      await Doctor.findOne({
        user: req.user.userId,
      })
        .populate(
          "user",
          "name email role profileImage"
        )
        .populate(
          "department",
          "name description"
        );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error(
      "Get doctor profile error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while fetching doctor profile",
    });
  }
};

/*
 * =====================================================
 * UPDATE DOCTOR PROFILE
 * =====================================================
 */

const updateDoctorProfile = async (
  req,
  res
) => {
  try {
    const {
      name,
      specialization,
      qualification,
      bio,
      experience,
      consultationFee,
      profileImage,
    } = req.body;

    const user =
      await User.findById(
        req.user.userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const doctor =
      await Doctor.findOne({
        user: user._id,
      });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found",
      });
    }
    const previousConsultationFee = doctor.consultationFee;

    if (name !== undefined) {
      user.name =
        String(name).trim();
    }

    if (
      specialization !==
      undefined
    ) {
      doctor.specialization =
        String(
          specialization
        ).trim();
    }

    if (
      qualification !==
      undefined
    ) {
      doctor.qualification =
        String(
          qualification
        ).trim();
    }

    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return res.status(400).json({
          success: false,
          message: "Bio must be a string",
        });
      }

      const trimmedBio = bio.trim();

      if (trimmedBio.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 2000 characters",
        });
      }

      doctor.bio = trimmedBio;
    }

    if (
      experience !==
      undefined
    ) {
      const value =
        Number(experience);

      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > 80
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Experience must be between 0 and 80 years",
        });
      }

      doctor.experience = value;
    }

    if (
      consultationFee !==
      undefined
    ) {
      const value =
        Number(
          consultationFee
        );

      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1000000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Consultation fee must be between 0 and 1000000",
        });
      }

      doctor.consultationFee =
        value;
    }

    if (
      profileImage !==
      undefined
    ) {
      if (
        profileImage === null ||
        profileImage === ""
      ) {
        user.profileImage = {
          url: "",
          publicId: "",
        };
      } else if (
        typeof profileImage ===
        "string"
      ) {
        const image =
          profileImage.trim();

        if (image.length > 2000) {
          return res.status(400).json({
            success: false,
            message:
              "Profile image URL is too long",
          });
        }

        user.profileImage = {
          url: image,

          publicId:
            user.profileImage
              ?.publicId || "",
        };
      } else if (
        typeof profileImage ===
        "object"
      ) {
        const imageUrl =
          String(
            profileImage.url ||
              ""
          ).trim();

        const publicId =
          String(
            profileImage.publicId ||
              ""
          ).trim();

        if (
          imageUrl.length > 2000
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Profile image URL is too long",
          });
        }

        user.profileImage = {
          url: imageUrl,
          publicId,
        };
      }
    }

    await user.save();
    await doctor.save();
    if (consultationFee !== undefined && previousConsultationFee !== doctor.consultationFee) {
      await recordAudit({
        req,
        action: "DOCTOR_FEE_UPDATED",
        resourceType: "Doctor",
        resourceId: doctor._id,
        targetId: doctor._id,
        metadata: { configured: doctor.consultationFee !== undefined },
      });
    }

    const updatedDoctor =
      await Doctor.findById(
        doctor._id
      )
        .populate(
          "user",
          "name email role profileImage"
        )
        .populate(
          "department",
          "name description"
        );

    return res.status(200).json({
      success: true,

      message:
        "Doctor profile updated successfully",

      doctor: updatedDoctor,
    });
  } catch (error) {
    console.error(
      "Update doctor profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while updating doctor profile",
    });
  }
};

/*
 * =====================================================
 * UPLOAD DOCTOR PROFILE IMAGE
 * =====================================================
 */

const uploadDoctorProfileImage =
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Profile image is required",
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

      const user =
        await User.findById(
          req.user.userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      if (
        user.profileImage?.publicId
      ) {
        try {
          await cloudinary.uploader.destroy(
            user.profileImage.publicId
          );
        } catch (deleteError) {
          console.error(
            "Old profile image delete error:",
            deleteError
          );
        }
      }

      const uploadResult =
        await new Promise(
          (resolve, reject) => {
            const stream =
              cloudinary.uploader.upload_stream(
                {
                  folder:
                    "smart-hospital/doctors",

                  resource_type:
                    "image",

                  transformation: [
                    {
                      width: 500,
                      height: 500,
                      crop: "fill",
                      gravity: "face",
                    },
                    {
                      quality: "auto",
                    },
                    {
                      fetch_format:
                        "auto",
                    },
                  ],
                },

                (
                  error,
                  result
                ) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
                }
              );

            stream.end(
              req.file.buffer
            );
          }
        );

      if (
        !uploadResult ||
        !uploadResult.secure_url ||
        !uploadResult.public_id
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Cloudinary upload failed",
        });
      }

      user.profileImage = {
        url:
          uploadResult.secure_url,

        publicId:
          uploadResult.public_id,
      };

      await user.save();

      const updatedDoctor =
        await Doctor.findById(
          doctor._id
        )
          .populate(
            "user",
            "name email role profileImage"
          )
          .populate(
            "department",
            "name description"
          );

      return res.status(200).json({
        success: true,

        message:
          "Profile picture updated successfully",

        doctor: updatedDoctor,
      });
    } catch (error) {
      console.error(
        "Upload doctor profile image error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error while uploading profile picture",
      });
    }
  };

/*
 * =====================================================
 * DELETE DOCTOR PROFILE IMAGE
 * =====================================================
 */

const deleteDoctorProfileImage =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      if (
        user.profileImage?.publicId
      ) {
        try {
          await cloudinary.uploader.destroy(
            user.profileImage.publicId
          );
        } catch (cloudinaryError) {
          console.error(
            "Cloudinary delete error:",
            cloudinaryError
          );
        }
      }

      user.profileImage = {
        url: "",
        publicId: "",
      };

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Profile picture removed successfully",
      });
    } catch (error) {
      console.error(
        "Delete doctor profile image error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while removing profile picture",
      });
    }
  };

/*
 * =====================================================
 * GET ALL DOCTORS
 * =====================================================
 */

const getDoctors = async (
  req,
  res
) => {
  try {
    const {
      department,
      specialization,
      search,
    } = req.query;

    const filter = {
      lifecycleStatus: "active",
    };

    if (department) {
      filter.department =
        department;
    }

    if (specialization) {
      filter.specialization = {
        $regex:
          specialization,
        $options: "i",
      };
    }

    let doctors =
      await Doctor.find(filter)
        .populate(
          "user",
          "name email role profileImage"
        )
        .populate(
          "department",
          "name description"
        )
        .sort({
          createdAt: -1,
        });

    if (search) {
      const searchRegex =
        new RegExp(
          search,
          "i"
        );

      doctors =
        doctors.filter(
          (doctor) =>
            searchRegex.test(
              doctor.user?.name ||
                ""
            ) ||
            searchRegex.test(
              doctor.user?.email ||
                ""
            ) ||
            searchRegex.test(
              doctor.specialization ||
                ""
            ) ||
            searchRegex.test(
              doctor.qualification ||
                ""
            ) ||
            searchRegex.test(
              doctor.department
                ?.name || ""
            )
        );
    }

    const doctorIds =
      doctors.map(
        (doctor) =>
          doctor._id
      );

    const availability =
      doctorIds.length > 0
        ? await DoctorAvailability.find(
            {
              doctor: {
                $in: doctorIds,
              },

              isActive: true,
            }
          ).sort({
            dayOfWeek: 1,
            startTime: 1,
          })
        : [];

    const doctorsWithAvailability =
      doctors.map(
        (doctor) => {
          const doctorAvailability =
            availability.filter(
              (item) =>
                item.doctor.toString() ===
                doctor._id.toString()
            );

          return {
            ...doctor.toObject(),

            availability:
              doctorAvailability,

            availableDays:
              doctor.availableDays ||
              [],
          };
        }
      );

    return res.status(200).json({
      success: true,

      count:
        doctorsWithAvailability.length,

      doctors:
        doctorsWithAvailability,
    });
  } catch (error) {
    console.error(
      "Get doctors error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while fetching doctors",
    });
  }
};

/*
 * =====================================================
 * GET TODAY'S QUEUE
 * =====================================================
 *
 * Queue date is determined by tokenDate.
 *
 * tokenDate is generated during appointment
 * booking from the hospital calendar date.
 *
 * Hospital timezone:
 * Asia/Kolkata
 */

const getTodayQueue = async (
  req,
  res
) => {
  try {
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

    /*
     * ---------------------------------------------------
     * TODAY'S HOSPITAL QUEUE DATE
     * ---------------------------------------------------
     *
     * Example:
     *
     * 25 Aug 2026 00:30 IST
     *        ↓
     * tokenDate = 25 Aug 2026 00:00 IST
     *        ↓
     * MongoDB UTC = 24 Aug 2026 18:30:00.000Z
     *
     * This MUST match the tokenDate created
     * by appointment booking.
     */

    const todayTokenDate =
      getHospitalStartOfDay();

    /*
     * ---------------------------------------------------
     * FETCH ONLY TODAY'S QUEUE
     * ---------------------------------------------------
     *
     * We intentionally use tokenDate instead of
     * appointmentDate.
     *
     * This keeps Doctor Queue and Call Next
     * on the same queue-date source of truth.
     */

    const appointments =
      await Appointment.find({
        doctor: doctor._id,

        tokenDate:
          todayTokenDate,
      })
        .populate(
          "patient",
          "user"
        )
        .populate({
          path: "patient",

          populate: {
            path: "user",

            select:
              "name email profileImage",
          },
        })
        .sort({
          tokenNumber: 1,
        });

    return res.status(200).json({
      success: true,

      count:
        appointments.length,

      /*
       * Doctor Portal reads this.
       */
      queue: appointments,

      /*
       * Backward compatibility.
       */
      appointments,
    });
  } catch (error) {
    console.error(
      "Get today's queue error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while fetching today's queue",
    });
  }
};

/*
 * =====================================================
 * GET DOCTOR BY ID
 * =====================================================
 */

const getDoctorById = async (
  req,
  res
) => {
  try {
    const doctor =
      await Doctor.findById(
        req.params.doctorId
      )
        .populate(
          "user",
          "name email role profileImage"
        )
        .populate(
          "department",
          "name description"
        );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor not found",
      });
    }

    if (doctor.lifecycleStatus !== "active") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const availability =
      await DoctorAvailability.find(
        {
          doctor: doctor._id,

          isActive: true,
        }
      ).sort({
        dayOfWeek: 1,
        startTime: 1,
      });

    return res.status(200).json({
      success: true,

      doctor: {
        ...doctor.toObject(),

        availability,

        availableDays:
          doctor.availableDays ||
          [],
      },
    });
  } catch (error) {
    console.error(
      "Get doctor by ID error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while fetching doctor",
    });
  }
};

/*
 * =====================================================
 * GET DOCTOR AVAILABILITY
 * =====================================================
 */

const getDoctorAvailability =
  async (req, res) => {
    try {
      const doctor =
        await Doctor.findById(
          req.params.doctorId
        );

      if (!doctor) {
        return res.status(404).json({
          success: false,

          message:
            "Doctor not found",
        });
      }

      const availability =
        await DoctorAvailability.find(
          {
            doctor: doctor._id,

            isActive: true,
          }
        ).sort({
          dayOfWeek: 1,
          startTime: 1,
        });

      return res.status(200).json({
        success: true,

        count:
          availability.length,

        availability,

        availableDays:
          doctor.availableDays ||
          [],
      });
    } catch (error) {
      console.error(
        "Get doctor availability error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while fetching doctor availability",
      });
    }
  };

/*
 * =====================================================
 * GET MY PATIENTS
 * =====================================================
 */

const getMyPatients = async (
  req,
  res
) => {
  try {
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

    const appointments =
      await Appointment.find({
        doctor: doctor._id,
      })
        .select(
          "patient appointmentDate tokenNumber status reason createdAt"
        )
        .sort({
          appointmentDate: -1,
        });

    const patientIds = [
      ...new Set(
        appointments
          .map(
            (appointment) =>
              appointment.patient?.toString()
          )
          .filter(Boolean)
      ),
    ];

    const patients =
      await Patient.find({
        _id: {
          $in: patientIds,
        },
      })
        .populate(
          "user",
          "name email role profileImage createdAt"
        )
        .sort({
          createdAt: -1,
        });

    const patientData =
      await Promise.all(
        patients.map(
          async (
            patient
          ) => {
            const patientAppointments =
              await Appointment.find(
                {
                  doctor:
                    doctor._id,

                  patient:
                    patient._id,
                }
              )
                .sort({
                  appointmentDate:
                    -1,
                })
                .select(
                  "appointmentDate tokenNumber status reason createdAt"
                );

            return {
              ...patient.toObject(),

              appointmentCount:
                patientAppointments.length,

              latestAppointment:
                patientAppointments[0] ||
                null,
            };
          }
        )
      );

    return res.status(200).json({
      success: true,

      count:
        patientData.length,

      patients:
        patientData,
    });
  } catch (error) {
    console.error(
      "Get doctor patients error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while fetching doctor patients",
    });
  }
};

/*
 * =====================================================
 * GET PATIENT DETAILS
 * =====================================================
 */

const getPatientDetails = async (
  req,
  res
) => {
  try {
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
        req.params.patientId
      ).populate(
        "user",
        "name email role profileImage createdAt"
      );

    if (!patient) {
      return res.status(404).json({
        success: false,

        message:
          "Patient not found",
      });
    }

    /*
     * Doctor can only view
     * patients who have appointments
     * with this doctor.
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
          "You are not authorized to view this patient",
      });
    }

    const appointments =
      await Appointment.find({
        doctor: doctor._id,

        patient: patient._id,
      })
        .sort({
          appointmentDate: -1,
        })
        .select(
          "appointmentDate tokenNumber status reason createdAt"
        );

    return res.status(200).json({
      success: true,

      patient,

      appointmentCount:
        appointments.length,

      appointments,
    });
  } catch (error) {
    console.error(
      "Get patient details error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while fetching patient details",
    });
  }
};

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  createDoctorProfile,
  getDoctorProfile,
  updateDoctorProfile,

  uploadDoctorProfileImage,
  deleteDoctorProfileImage,

  getDoctors,
  getTodayQueue,

  getDoctorById,
  getDoctorAvailability,

  getMyPatients,
  getPatientDetails,
};