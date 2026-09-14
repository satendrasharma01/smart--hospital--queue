const Department = require("../models/Department");
const Doctor = require("../models/Doctor");
const mongoose = require("mongoose");

const getDepartments = async (req, res) => {
  try {
    const filter =
      req.user?.role === "admin" && req.query.includeInactive === "true"
        ? {}
        : { isActive: true };
    const departments = await Department.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching departments",
    });
  }
};

const createDepartment = async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ success: false, message: "Department name is required" });
  try {
    const department = await Department.create({
      name,
      description: String(req.body.description || "").trim(),
    });
    return res.status(201).json({ success: true, department });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Department already exists" });
    }
    throw error;
  }
};

const updateDepartment = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.departmentId)) {
    return res.status(400).json({ success: false, message: "Invalid department ID" });
  }
  const updates = {};
  if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
  if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
  if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.departmentId,
      updates,
      { new: true, runValidators: true }
    );
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    return res.json({ success: true, department });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Department already exists" });
    }
    throw error;
  }
};

const deleteDepartment = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.departmentId)) {
    return res.status(400).json({ success: false, message: "Invalid department ID" });
  }
  const referenced = await Doctor.exists({ department: req.params.departmentId });
  if (referenced) {
    return res.status(409).json({
      success: false,
      message: "Department is referenced by doctors; deactivate it instead",
    });
  }
  const department = await Department.findByIdAndDelete(req.params.departmentId);
  if (!department) return res.status(404).json({ success: false, message: "Department not found" });
  return res.json({ success: true, message: "Department deleted" });
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};