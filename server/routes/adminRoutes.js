const express = require("express");
const router = express.Router();

const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");
const departmentController = require("../controllers/departmentController");

// 🔥 Secure ALL admin routes automatically
router.use(verifyToken);
router.use(authorizeRole("admin"));

/* =========================
   DASHBOARD & ANALYTICS
========================= */
router.get("/dashboard", adminController.getDashboardStats);
router.get("/monthly-revenue", adminController.getMonthlyRevenue);
router.get("/doctor-revenue", adminController.getDoctorRevenue);
router.put("/consultation-fee", adminController.updateConsultationFee);
router.get("/consultation-fee", adminController.getConsultationFee);

/* =========================
   USER MANAGEMENT
========================= */
router.get("/users", adminController.getAllUsers);
router.put("/users/:id", adminController.updateUser);
router.put("/users/:id/status", adminController.toggleUserStatus);
router.delete("/users/:id", adminController.deleteUser); // 🔥 FIXED: Removed undefined middleware

/* =========================
   DEPARTMENT MANAGEMENT
========================= */
router.get("/departments", departmentController.getDepartments);
router.post("/departments", departmentController.createDepartment);
router.put("/departments/:id", departmentController.updateDepartment);
router.patch("/departments/:id/toggle", departmentController.toggleDepartmentStatus);
router.delete("/departments/:id", departmentController.deleteDepartment);

/* =========================
   LAB TEST MANAGEMENT
========================= */
router.get("/lab-tests", adminController.getLabTests);
router.post("/lab-tests", adminController.createLabTest);
router.put("/lab-tests/:id", adminController.updateLabTest);
router.patch("/lab-tests/:id/toggle", adminController.toggleLabTestStatus);
router.delete("/lab-tests/:id", adminController.deleteLabTest);

module.exports = router;