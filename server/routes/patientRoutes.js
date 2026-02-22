const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const role = require("../middleware/role");
const patient = require("../controllers/patientController");

/* View profile */
router.get("/profile", auth, role("patient"), patient.getProfile);

/* Update profile */
router.put("/profile", auth, role("patient"), patient.updateProfile);

module.exports = router;
