const express = require("express");
const router = express.Router();

const reportController = require("../controllers/reportController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

// Protect all routes
router.use(verifyToken);

// Department Revenue (Pie Chart)
router.get(
  "/department-revenue",
  authorizeRole("admin"),
  reportController.getDepartmentRevenue
);

// Patient Registration Trend (Line Chart)
router.get(
  "/patient-trend",
  authorizeRole("admin"),
  reportController.getPatientTrend
);

// Doctor Performance (Bar Chart)
router.get(
  "/doctor-performance",
  authorizeRole("admin"),
  reportController.getDoctorPerformance
);

module.exports = router;