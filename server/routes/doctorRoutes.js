const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctorController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.use(auth);
router.use(role("doctor"));

router.get("/appointments", doctorController.getMyAppointments);
router.put("/start/:id", doctorController.startConsultation);
router.post("/medical-record", doctorController.addMedicalRecord);
router.post("/prescription", doctorController.addPrescription);
router.post("/lab-request", doctorController.addLabRequest);
router.put("/complete/:id", doctorController.completeConsultation);

module.exports = router;
