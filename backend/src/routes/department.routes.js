const express = require("express");

const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/department.controller");
const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const router = express.Router();

router.get("/", getDepartments);
router.get("/admin", protect, authorizeRoles("admin"), getDepartments);
router.post("/", protect, authorizeRoles("admin"), createDepartment);
router.patch("/:departmentId", protect, authorizeRoles("admin"), updateDepartment);
router.delete("/:departmentId", protect, authorizeRoles("admin"), deleteDepartment);

module.exports = router;