// =====================================================
// ENVIRONMENT VARIABLES
// IMPORTANT: Load .env BEFORE importing routes/controllers
// that depend on environment variables.
// =====================================================

const dotenv = require("dotenv");

dotenv.config();

// =====================================================
// CORE IMPORTS
// =====================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const { Server } = require("socket.io");

// =====================================================
// DATABASE
// =====================================================

const connectDB = require("./config/db");

// =====================================================
// MIDDLEWARE
// =====================================================

const protect = require("./middleware/auth.middleware");
const authorizeRoles = require("./middleware/role.middleware");

// =====================================================
// ROUTES
// =====================================================

const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const doctorRoutes = require("./routes/doctor.routes");
const departmentRoutes = require("./routes/department.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const queueRoutes = require("./routes/queue.routes");
const adminRoutes = require("./routes/admin.routes");

const doctorAvailabilityRoutes =
  require("./routes/doctorAvailability.route");

const medicalRecordRoutes =
  require("./routes/medicalRecord.routes");

// =====================================================
// SOCKET UTILITY
// =====================================================

const { setSocketIO } = require("./utils/socket");
const { requestContext, getMetrics } = require("./middleware/requestContext.middleware");
const { reportError } = require("./services/monitoring.service");
const Session = require("./models/Session");
const Appointment = require("./models/Appointment");
const Doctor = require("./models/Doctor");
const { startMissedAppointmentWorker } = require("./services/missedAppointment.service");
const Patient = require("./models/Patient");
const { verifyEmailTransporter } = require("./services/email.service");

// =====================================================
// APP INITIALIZATION
// =====================================================

const app = express();
app.disable("x-powered-by");

// =====================================================
// DATABASE CONNECTION
// =====================================================

connectDB();

// =====================================================
// SECURITY
// =====================================================

app.use(helmet());
app.use(requestContext);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = (
  process.env.FRONTEND_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (
  process.env.NODE_ENV !== "production" &&
  allowedOrigins.includes("http://localhost:5173") &&
  !allowedOrigins.includes("http://127.0.0.1:5173")
) {
  allowedOrigins.push("http://127.0.0.1:5173");
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin,
      // such as Postman or server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,
  })
);

// =====================================================
// BODY PARSERS
// =====================================================

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(cookieParser());

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/auth", authRoutes);

app.use("/api/patients", patientRoutes);

app.use("/api/doctors", doctorRoutes);

app.use("/api/departments", departmentRoutes);

app.use("/api/appointments", appointmentRoutes);

app.use("/api/queue", queueRoutes);

app.use("/api/admin", adminRoutes);

app.use(
  "/api/doctor-availability",
  doctorAvailabilityRoutes
);

app.use(
  "/api/medical-records",
  medicalRecordRoutes
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/metrics", protect, authorizeRoles("admin"), (req, res) => {
  res.json({ success: true, metrics: getMetrics() });
});

// =====================================================
// AUTHENTICATION TEST
// =====================================================

app.get("/api/auth/me", protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: "You are authenticated",
    user: req.user,
  });
});

// =====================================================
// ROLE TEST ROUTES
// =====================================================

app.get(
  "/api/test/patient",
  protect,
  authorizeRoles("patient"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Patient access granted",
      user: req.user,
    });
  }
);

app.get(
  "/api/test/doctor",
  protect,
  authorizeRoles("doctor"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Doctor access granted",
      user: req.user,
    });
  }
);

app.get(
  "/api/test/admin",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin access granted",
      user: req.user,
    });
  }
);

// =====================================================
// GLOBAL ERROR HANDLER
// IMPORTANT:
// This must be AFTER all routes and BEFORE server.listen()
// =====================================================

app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    level: "error",
    message: "request_failed",
    requestId: req.requestId,
    errorName: err?.name,
    errorCode: err?.code,
  }));
  reportError(err, { requestId: req.requestId, route: req.originalUrl });

  // ===================================================
  // MULTER ERROR
  // ===================================================

  if (err?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: "Invalid upload",
      code: err.code || "UPLOAD_ERROR",
    });
  }

  // ===================================================
  // PROFILE IMAGE FILE TYPE ERROR
  // ===================================================

  if (
    err?.message ===
    "Only JPG, PNG and WebP images are allowed."
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: "INVALID_FILE_TYPE",
    });
  }

  // ===================================================
  // PAYLOAD TOO LARGE
  // ===================================================

  if (
    err?.type === "entity.too.large" ||
    err?.status === 413
  ) {
    return res.status(413).json({
      success: false,
      message:
        "Request body is too large. Maximum allowed size is 1MB.",
    });
  }

  // ===================================================
  // CORS ERROR
  // ===================================================

  if (
    err?.message === "Not allowed by CORS"
  ) {
    return res.status(403).json({
      success: false,
      message: "Request blocked by CORS policy.",
    });
  }

  // ===================================================
  // DEFAULT ERROR
  // ===================================================

  const statusCode =
    err?.statusCode ||
    err?.status ||
    500;

  return res.status(statusCode).json({
    success: false,

    message: statusCode >= 500 ? "Internal server error." : (err?.message || "Request failed"),
    code: err?.code || "REQUEST_ERROR",
    requestId: req.requestId,
  });
});

// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

setSocketIO(io);

io.on("connection", (socket) => {
  console.log(
    `Socket connected: ${socket.id}`
  );

  const authorizeQueueJoin = async (doctorId) => {
    try {
      const token = (socket.handshake.headers.cookie || "")
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("accessToken="))
        ?.slice("accessToken=".length);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const session = await Session.findOne({
        _id: decoded.sessionId,
        user: decoded.userId,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      }).select("_id");
      if (!session) throw new Error("Session expired");
      if (!mongoose.Types.ObjectId.isValid(doctorId)) throw new Error("Invalid doctor");
      if (decoded.role === "doctor") {
        const operationalDoctor = await Doctor.findOne({
          user: decoded.userId,
          lifecycleStatus: "active",
        }).select("_id");
        if (!operationalDoctor || String(operationalDoctor._id) !== String(doctorId)) {
          throw new Error("Queue access denied");
        }
      }
      if (decoded.role === "patient") {
        const patient = await Patient.findOne({ user: decoded.userId }).select("_id");
        const appointment = await Appointment.exists({
          patient: patient?._id,
          doctor: doctorId,
          status: { $nin: ["cancelled", "completed"] },
        });
        if (!appointment) throw new Error("Queue access denied");
      }
      socket.user = decoded;
      return decoded;
    } catch {
      return null;
    }
  };

  socket.on("joinQueue", async (doctorId, acknowledge) => {
    const user = await authorizeQueueJoin(doctorId);
    if (!user) {
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message: "Queue authorization failed" });
      }
      return;
    }

    socket.join(`queue:${doctorId}`);
    if (typeof acknowledge === "function") {
      acknowledge({ success: true, room: `queue:${doctorId}` });
    }

    console.log(
      `Socket ${socket.id} joined queue:${doctorId}`
    );
  });

  socket.on("disconnect", () => {
    console.log(
      `Socket disconnected: ${socket.id}`
    );
  });
});

// =====================================================
// SERVER ERROR HANDLING
// Prevent unhandled EADDRINUSE crashes from being silent
// =====================================================

server.on("error", (error) => {
  console.error("");
  console.error("==========================================");
  console.error("SERVER ERROR");
  console.error("==========================================");

  console.error("Error code:", error.code);
  console.error("Error message:", error.message);
  console.error("Error:", error);

  console.error("==========================================");
  console.error("");

  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already being used by another process.`
    );

    console.error(
      `Stop the process using port ${PORT}, then restart the backend.`
    );

    process.exit(1);
  }
});

// =====================================================
// START SERVER
// =====================================================

server.listen(PORT, () => {
  verifyEmailTransporter()
    .then(() => {
      console.log("SMTP ready");
    })
    .catch((error) => {
      console.error(
        "SMTP not ready:",
        error.message
      );
    });

  console.log("");
  console.log("==========================================");

  console.log(
    `Smart Hospital Queue API running on port ${PORT}`
  );

  console.log("==========================================");

  console.log("Environment loaded:", {
    mongoConfigured:
      Boolean(process.env.MONGO_URI),

    jwtConfigured:
      Boolean(process.env.JWT_SECRET),

    frontendUrl:
      allowedOrigins,

    smtpHost:
      process.env.SMTP_HOST ||
      "NOT_CONFIGURED",

    smtpPort:
      process.env.SMTP_PORT ||
      "NOT_CONFIGURED",

    smtpSecure:
      process.env.SMTP_SECURE ||
      "NOT_CONFIGURED",

    smtpUser:
      process.env.SMTP_USER ||
      "NOT_CONFIGURED",

    smtpPasswordConfigured:
      Boolean(process.env.SMTP_PASSWORD),

    cloudinaryConfigured:
      Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
  });
  startMissedAppointmentWorker();
});
