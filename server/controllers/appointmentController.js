const db = require("../config/db");
const sendEmail = require("../utils/sendEmail"); // 🔥 Import the new email utility

/* ============================
   BOOK APPOINTMENT
============================ */
exports.bookAppointment = async (req, res) => {
  try {
    const { department, appointment_date, start_time } = req.body;
    const patient_id = req.user.id;

    if (!department || !appointment_date || !start_time) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1. Prevent patient from booking more than 2 appointments per day
    const [existingAppts] = await db.execute(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE patient_id = ? AND appointment_date = ? AND status != 'cancelled'`,
      [patient_id, appointment_date] 
    );

    if (existingAppts[0].count >= 2) {
      return res.status(400).json({ 
        message: "Booking limit reached: You can only book a maximum of 2 appointments per day." 
      });
    }

    // 2. Prevent patient from double-booking the EXACT SAME time slot for themselves
    const [exactTimeMatch] = await db.execute(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE patient_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'cancelled'`,
      [patient_id, appointment_date, start_time] 
    );

    if (exactTimeMatch[0].count > 0) {
      return res.status(400).json({ 
        message: "You already have an appointment booked at this exact time." 
      });
    }

    // 3. Wallet Balance Check (and fetch user details for email)
    const [userRows] = await db.execute(
      `SELECT full_name, email, wallet_balance FROM users WHERE user_id = ?`,
      [patient_id]
    );

    if (userRows.length === 0 || userRows[0].wallet_balance < 100) {
      return res.status(400).json({ 
        message: "Insufficient balance. You need at least ₹100 in your wallet to request an appointment." 
      });
    }

    const patient = userRows[0]; // Save patient details for the email

    // 4. Past Time & 7-Day Restrictions
    const now = new Date();
    const todayString = now.toISOString().split("T")[0];

    if (appointment_date === todayString) {
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      if (start_time < currentTime) {
        return res.status(400).json({ message: "Cannot book a time slot in the past." });
      }
    }

    const maxDateObj = new Date();
    maxDateObj.setDate(now.getDate() + 7);
    const maxDateString = maxDateObj.toISOString().split("T")[0];

    if (appointment_date > maxDateString) {
      return res.status(400).json({ message: "You can only book appointments up to 7 days in advance." });
    }

    // 🔥 5. SLOT CAPACITY LOGIC (DYNAMIC DOCTOR COUNT)
    const [doctorRows] = await db.execute(
      `SELECT COUNT(*) as doctor_count FROM users WHERE role = 'doctor' AND department = ? AND status = 'active'`,
      [department]
    );
    const doctorCapacity = doctorRows[0].doctor_count || 0;

    if (doctorCapacity === 0) {
      return res.status(400).json({ message: "Sorry, there are no active doctors currently assigned to this department." });
    }

    const [slotBookings] = await db.execute(
      `SELECT COUNT(*) as appt_count FROM appointments 
       WHERE department = ? AND appointment_date = ? AND appointment_time = ? AND status != 'cancelled'`,
      [department, appointment_date, start_time]
    );

    if (slotBookings[0].appt_count >= doctorCapacity) {
      return res.status(400).json({
        message: `This slot is fully booked. The department has ${doctorCapacity} doctor(s) and they are all busy at this time.`
      });
    }

    // 6. Insert the appointment
    await db.execute(
      `INSERT INTO appointments (patient_id, department, appointment_date, appointment_time, status)
       VALUES (?,?,?,?,?)`,
      [patient_id, department, appointment_date, start_time, "pending"]
    );

    // 🔥 7. SEND BOOKING CONFIRMATION EMAIL
    try {
      const emailMessage = `Dear ${patient.full_name},\n\nWe have successfully received your appointment request at MediCare HMS.\n\nDetails:\n- Department: ${department.toUpperCase()}\n- Date: ${appointment_date}\n- Time: ${start_time}\n- Status: Pending Confirmation\n\nPlease wait for the receptionist to confirm your appointment. You will receive further updates in your dashboard.\n\nThank you,\nMediCare HMS Support`;
      
      await sendEmail({
        to: patient.email,
        subject: `Appointment Requested - ${appointment_date}`,
        text: emailMessage
      });
    } catch (emailErr) {
      console.error("Non-fatal: Booking email failed to send", emailErr);
    }

    res.status(201).json({ message: "Appointment requested successfully. Fee will be deducted upon confirmation." });

  } catch (err) {
    console.error("BOOK ERROR:", err);
    res.status(500).json({ message: "Booking failed" });
  }
};

/* ============================
   MY APPOINTMENTS
============================ */
exports.myAppointments = async (req, res) => {
  try {
    const patient_id = req.user.id;
    const [rows] = await db.execute(
      `SELECT a.appointment_id, a.department, a.appointment_date, a.appointment_time, 
              a.status, a.cancelled_by, u.full_name AS doctor_name
       FROM appointments a
       LEFT JOIN users u ON a.doctor_id = u.user_id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC`,
      [patient_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("MY APPOINTMENTS ERROR:", err);
    res.status(500).json({ message: "Failed to load appointments" });
  }
};

/* ============================
   CANCEL APPOINTMENT
============================ */
exports.cancelAppointment = async (req, res) => {
  try {
    const patient_id = req.user.id;

    // 🔥 Modified to also fetch user details for the email
    const [rows] = await db.execute(
      `SELECT a.appointment_date, a.appointment_time, a.department, u.full_name, u.email 
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.appointment_id=? AND a.patient_id=?`,
      [req.params.id, patient_id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Appointment not found" });

    const { appointment_date, appointment_time, department, full_name, email } = rows[0];
    const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`);
    const now = new Date();
    const diffHours = (appointmentDateTime - now) / (1000 * 60 * 60);

    if (diffHours < 1) {
      return res.status(400).json({ message: "Cannot cancel within 1 hour of appointment time" });
    }

    await db.execute(
      `UPDATE appointments SET status='cancelled', cancelled_by='patient' WHERE appointment_id=? AND patient_id=?`,
      [req.params.id, patient_id]
    );

    // 🔥 SEND CANCELLATION EMAIL
    try {
      const cancelMessage = `Dear ${full_name},\n\nYour appointment at MediCare HMS has been successfully cancelled.\n\nCancelled Details:\n- Department: ${department.toUpperCase()}\n- Date: ${appointment_date}\n- Time: ${appointment_time}\n\nIf you cancelled a confirmed appointment, your wallet refund will be processed according to our hospital policy.\n\nThank you,\nMediCare HMS Support`;
      
      await sendEmail({
        to: email,
        subject: `Appointment Cancelled - ${appointment_date}`,
        text: cancelMessage
      });
    } catch (emailErr) {
      console.error("Non-fatal: Cancellation email failed to send", emailErr);
    }

    res.json({ message: "Appointment cancelled successfully" });
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    res.status(500).json({ message: "Cancel failed" });
  }
};

/* ============================
   GET BOOKED SLOTS (CAPACITY AWARE)
============================ */
exports.getBookedSlots = async (req, res) => {
  try {
    const { department, date } = req.query;

    if (!department || !date) {
      return res.status(400).json({ message: "Missing params" });
    }

    const [doctorRows] = await db.execute(
      `SELECT COUNT(*) as doctor_count FROM users WHERE role = 'doctor' AND department = ? AND status = 'active'`,
      [department]
    );
    const doctorCapacity = doctorRows[0].doctor_count || 1;

    const [rows] = await db.execute(
      `SELECT appointment_time, COUNT(*) as appt_count
       FROM appointments
       WHERE department = ? AND appointment_date = ? AND status != 'cancelled'
       GROUP BY appointment_time`,
      [department, date]
    );

    const fullyBookedSlots = rows
      .filter(row => row.appt_count >= doctorCapacity)
      .map(row => ({ appointment_time: row.appointment_time }));

    res.json(fullyBookedSlots);

  } catch (err) {
    console.error("BOOKED SLOTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};