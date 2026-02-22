const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");

/* Admin only */
router.get("/admin", auth, role("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

/* Doctor only */
router.get("/doctor", auth, role("doctor"), (req, res) => {
  res.json({ message: "Welcome Doctor" });
});

/* Patient only */
router.get("/patient", auth, role("patient"), (req, res) => {
  res.json({ message: "Welcome Patient" });
});

/* Multiple roles */
router.get("/staff", auth, role("doctor","receptionist","lab","pharmacist","admin"), (req, res) => {
  res.json({ message: "Welcome Staff" });
});

module.exports = router;
