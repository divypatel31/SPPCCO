const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const appointment = require("../controllers/appointmentController");

router.post("/book", auth, appointment.bookAppointment);
router.get("/my", auth, appointment.myAppointments);
router.put("/cancel/:id", auth, appointment.cancelAppointment);
router.get("/booked-slots", auth, appointment.getBookedSlots);

module.exports = router;
