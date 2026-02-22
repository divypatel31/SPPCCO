const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

router.use(verifyToken);

// Because already mounted at /api/admin/departments
router.get("/", authorizeRole("admin"), departmentController.getDepartments);
router.post("/", authorizeRole("admin"), departmentController.createDepartment);

router.put("/:id", authorizeRole("admin"), departmentController.updateDepartment);
router.patch("/:id/toggle", authorizeRole("admin"), departmentController.toggleDepartmentStatus);

module.exports = router;
