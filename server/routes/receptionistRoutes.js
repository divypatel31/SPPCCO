const express = require("express");
const router = express.Router();

const receptionistController = require("../controllers/receptionistController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

// Protect all routes
router.use(verifyToken);
router.use(authorizeRole("receptionist"));

// 1️⃣ Get pending appointments
router.get("/pending-appointments", receptionistController.getPendingAppointments);

// 2️⃣ Assign doctor
router.post("/assign-doctor", receptionistController.assignDoctor);

// 3️⃣ Mark patient arrived
router.put("/mark-arrived/:id", receptionistController.markArrived);

// 4️⃣ Get completed appointments (ready for billing)
router.get("/completed-appointments", receptionistController.getCompletedAppointments);

// 5️⃣ Generate bill
router.post("/generate-bill", receptionistController.generateBill);

// 6️⃣ Mark bill paid
router.put("/mark-paid/:id", receptionistController.markBillPaid);

router.get("/doctors", receptionistController.getDoctorsByDepartment);

router.get("/today-queue", receptionistController.getTodayQueue);

module.exports = router;
