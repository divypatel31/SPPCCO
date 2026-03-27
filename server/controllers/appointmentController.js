const db = require("../config/db");
const sendEmail = require("../utils/sendEmail"); // 🔥 Imported Email Utility

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

    // 3. Wallet Balance Check (🔥 Added email and full_name for the email notification)
    const [userRows] = await db.execute(
      `SELECT wallet_balance, email, full_name FROM users WHERE user_id = ?`,
      [patient_id]
    );

    if (userRows.length === 0 || userRows[0].wallet_balance < 100) {
      return res.status(400).json({ 
        message: "Insufficient balance. You need at least ₹100 in your wallet to request an appointment." 
      });
    }

    const { email, full_name } = userRows[0];

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

    // 🔥 7. SEND HTML EMAIL NOTIFICATION TO PATIENT
    try {
      const bookHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0d9488; margin: 0;">Appointment Requested</h2>
          </div>
          <p>Dear <b>${full_name}</b>,</p>
          <p>We have successfully received your appointment request at MediCare HMS.</p>
          
          <div style="background-color: #f0fdfa; padding: 15px; border-radius: 8px; border-left: 4px solid #0d9488; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Department:</b> <span style="text-transform: capitalize;">${department}</span></p>
            <p style="margin: 5px 0;"><b>Date:</b> ${new Date(appointment_date).toDateString()}</p>
            <p style="margin: 5px 0;"><b>Time:</b> ${start_time}</p>
            <p style="margin: 5px 0;"><b>Status:</b> Pending Confirmation</p>
          </div>

          <p>Your request is currently pending. You will receive another email once a doctor has been assigned and your time slot is officially confirmed.</p>
          <p>Best regards,<br><b>MediCare HMS Team</b></p>
        </div>
      `;

      const fallbackText = `Dear ${full_name},\n\nWe have received your appointment request for ${department} on ${appointment_date} at ${start_time}.\n\nYour request is currently pending. We will notify you once a doctor is assigned.\n\nBest regards,\nMediCare HMS Team`;

      await sendEmail({
        to: email,
        subject: "Appointment Request Received - MediCare HMS",
        html: bookHtml,
        text: fallbackText
      });
      console.log("✅ Patient Booking Request Email Sent to Brevo!");
    } catch (emailErr) {
      console.error("🚨 Non-fatal: Booking email failed", emailErr);
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

    // 🔥 Updated to join with users table to get patient email and name
    const [rows] = await db.execute(
      `SELECT a.appointment_date, a.appointment_time, a.department, u.email, u.full_name 
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.appointment_id=? AND a.patient_id=?`,
      [req.params.id, patient_id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Appointment not found" });

    const { appointment_date, appointment_time, department, email, full_name } = rows[0];
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

    // 🔥 SEND HTML EMAIL NOTIFICATION FOR PATIENT CANCELLATION
    try {
      const cancelHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin: 0;">Appointment Cancelled</h2>
          </div>
          <p>Dear <b>${full_name}</b>,</p>
          <p>Your appointment has been successfully cancelled as per your request.</p>
          
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Department:</b> <span style="text-transform: capitalize;">${department}</span></p>
            <p style="margin: 5px 0;"><b>Date:</b> ${new Date(appointment_date).toDateString()}</p>
            <p style="margin: 5px 0;"><b>Time:</b> ${appointment_time.slice(0, 5)}</p>
          </div>

          <p>If you cancelled an already-confirmed appointment, any applicable wallet refunds will be processed according to hospital policy.</p>
          <p>Best regards,<br><b>MediCare HMS Team</b></p>
        </div>
      `;

      const fallbackText = `Dear ${full_name},\n\nYour appointment for ${department} on ${appointment_date} at ${appointment_time} has been successfully cancelled.\n\nBest regards,\nMediCare HMS Team`;

      await sendEmail({
        to: email,
        subject: "Appointment Cancelled - MediCare HMS",
        html: cancelHtml,
        text: fallbackText
      });
      console.log("✅ Patient Cancellation Email Sent to Brevo!");
    } catch (emailErr) {
      console.error("🚨 Non-fatal: Cancellation email failed", emailErr);
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