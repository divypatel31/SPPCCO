const express = require("express");
const router = express.Router();

const billingController = require("../controllers/billingController");

const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

// All billing routes require login
router.use(verifyToken);

// Generate bill → receptionist or admin
router.post(
  "/generate",
  authorizeRole("receptionist", "admin"),
  billingController.generateBill
);

// Mark bill as paid → receptionist, admin, pharmacist
router.post(
  "/mark-paid",
  authorizeRole("receptionist", "admin", "pharmacist"),
  billingController.markBillPaid
);

router.post(
  "/generate-lab/:appointmentId",
  authorizeRole("receptionist", "admin"),
  billingController.generateLabBill
);

// Mark bill as paid
router.put(
  "/:id/pay",
  authorizeRole("receptionist"),
  billingController.markBillAsPaid
);

// Patient view own bills
router.get(
  "/my-bills",
  authorizeRole("patient"),
  billingController.getPatientBills
);

router.get(
  "/admin/revenue",
  authorizeRole("admin"),
  billingController.getRevenueSummary
);


module.exports = router;
