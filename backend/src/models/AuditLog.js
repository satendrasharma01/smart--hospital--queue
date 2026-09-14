const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: { type: String, enum: ["patient", "doctor", "admin", "system"] },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    requestId: { type: String, index: true },
    ip: { type: String },
    success: { type: Boolean, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, strict: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
