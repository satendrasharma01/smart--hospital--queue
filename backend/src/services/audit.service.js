const AuditLog = require("../models/AuditLog");

const recordAudit = async ({
  req,
  action,
  resourceType,
  resourceId,
  targetId,
  success = true,
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      actor: req?.user?.userId,
      actorRole: req?.user?.role || "system",
      action,
      resourceType,
      resourceId,
      targetId,
      requestId: req?.requestId,
      ip: req?.ip,
      success,
      metadata,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "audit_write_failed",
        requestId: req?.requestId,
        errorCode: error.code,
      })
    );
  }
};

module.exports = { recordAudit };
