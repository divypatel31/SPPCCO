const express = require("express");
const router = express.Router();

const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

const adminController = require("../controllers/adminController");
const departmentController = require("../controllers/departmentController");

router.use(verifyToken);
router.use(authorizeRole("admin"));

/* =========================
   DASHBOARD
========================= */

router.get("/dashboard", adminController.getDashboardStats);
router.get("/monthly-revenue", adminController.getMonthlyRevenue);
router.put("/consultation-fee",authorizeRole("admin"),adminController.updateConsultationFee);

/* =========================
   USER MANAGEMENT
========================= */

router.get("/users", adminController.getAllUsers);
router.put("/users/:id", adminController.updateUser);
router.put("/users/:id/status", adminController.toggleUserStatus);

/* =========================
   DEPARTMENT MANAGEMENT
========================= */

router.get("/departments", departmentController.getDepartments);
router.post("/departments", departmentController.createDepartment);
router.put("/departments/:id", departmentController.updateDepartment);
router.patch("/departments/:id/toggle", departmentController.toggleDepartmentStatus);

/* =========================
   LAB TEST MANAGEMENT
========================= */

router.get("/lab-tests", adminController.getLabTests);
router.post("/lab-tests", adminController.createLabTest);
router.put("/lab-tests/:id", adminController.updateLabTest);
router.patch("/lab-tests/:id/toggle", adminController.toggleLabTestStatus);

module.exports = router;