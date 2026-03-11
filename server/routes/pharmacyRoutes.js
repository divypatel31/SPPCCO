const express = require("express");
const router = express.Router();

const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const pharmacyController = require("../controllers/pharmacyController");

router.use(verifyToken);

// Admin add medicine
router.post(
  "/medicine",
  authorizeRole("admin"),
  pharmacyController.addMedicine
);

// View all medicines
router.get(
  "/medicine",
  authorizeRole("admin", "pharmacist", "doctor"),
  pharmacyController.getMedicines
);

// Update stock
router.put(
  "/medicine/:id",
  authorizeRole("admin"),
  pharmacyController.updateMedicine
);

// Generate pharmacy bill
router.post(
  "/sell",
  authorizeRole("pharmacist", "admin"),
  pharmacyController.sellMedicines
);

router.get(
  "/low-stock",
  authorizeRole("admin", "pharmacist"),
  pharmacyController.getLowStock
);

router.get(
  "/top-selling",
  authorizeRole("admin"),
  pharmacyController.getTopSellingMedicines
);

router.get(
  "/prescriptions",
  authorizeRole("pharmacist"),
  pharmacyController.getPendingPrescriptions
);

router.get(
  "/prescriptions/:id",
  authorizeRole("pharmacist"),
  pharmacyController.getPrescriptionItems
);

router.get(
  "/bills",
  authorizeRole("pharmacist", "admin"),
  pharmacyController.getPharmacyBills
);

router.put(
  "/bills/:id/mark-paid",
  authorizeRole("pharmacist", "admin"),
  pharmacyController.markBillPaid
);

// Add this with your other routes
router.put("/cancel/:id", authorizeRole("pharmacy"), pharmacyController.cancelPrescription);

module.exports = router;