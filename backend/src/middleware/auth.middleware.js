const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const Doctor = require("../models/Doctor");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = req.cookies?.accessToken ||
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.sessionId) {
      const session = await Session.findOne({ _id: decoded.sessionId, user: decoded.userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).select("_id");
      if (!session) return res.status(401).json({ success: false, message: "Session expired or revoked" });
    }

    if (decoded.role === "doctor") {
      const doctor = await Doctor.findOne({ user: decoded.userId }).select("lifecycleStatus");
      if (!doctor || doctor.lifecycleStatus !== "active") {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not operational",
        });
      }
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = protect;