const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const role = require("../middleware/role");
const patient = require("../controllers/patientController");

/* View profile */
router.get("/profile", auth, role("patient"), patient.getProfile);

/* Update profile */
router.put("/profile", auth, role("patient"), patient.updateProfile);

/* 🔥 FIXED: This must be /wallet-balance, NOT /profile */
router.get("/wallet-balance", auth, role("patient"), patient.getWalletBalance);

/* Add to wallet */
router.post('/wallet/add', auth, role("patient"), patient.addWalletBalance);

router.get("/prescriptions", auth, role("patient"), patient.getMyPrescriptions);

router.get("/lab-reports", auth, role("patient"), patient.getMyLabReports);

module.exports = router;