const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

/* 🌍 PUBLIC (any logged in user) */
router.get("/public", verifyToken, departmentController.getActiveDepartments);

/* 🔒 ADMIN ONLY */
router.get("/", verifyToken, authorizeRole("admin"), departmentController.getDepartments);
router.post("/", verifyToken, authorizeRole("admin"), departmentController.createDepartment);
router.put("/:id", verifyToken, authorizeRole("admin"), departmentController.updateDepartment);
router.patch("/:id/toggle", verifyToken, authorizeRole("admin"), departmentController.toggleDepartmentStatus);
router.delete("/:id", verifyToken, authorizeRole("admin"), departmentController.deleteDepartment);

module.exports = router;