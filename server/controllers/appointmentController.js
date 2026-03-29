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
   CANCEL APPOINTMENT (SMART REFUND LOGIC)
============================ */
exports.cancelAppointment = async (req, res) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role; // 'patient', 'doctor', 'receptionist', etc.
    const appointment_id = req.params.id;

    // 1. Fetch the appointment and patient details
    const [rows] = await db.execute(
      `SELECT a.appointment_date, a.appointment_time, a.department, a.status, a.patient_id, 
              u.email, u.full_name, u.wallet_balance 
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.appointment_id = ?`,
      [appointment_id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Appointment not found" });

    const appt = rows[0];

    // 2. Prevent cancelling an already cancelled appointment
    if (appt.status === 'cancelled') {
      return res.status(400).json({ message: "This appointment is already cancelled." });
    }

    // 3. Patient-Specific Rule: 1 Hour Window & Ownership check
    if (user_role === 'patient') {
      if (appt.patient_id !== user_id) {
        return res.status(403).json({ message: "Unauthorized to cancel this appointment" });
      }
      
      const appointmentDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
      const now = new Date();
      const diffHours = (appointmentDateTime - now) / (1000 * 60 * 60);

      if (diffHours < 1) {
        return res.status(400).json({ message: "Cannot cancel within 1 hour of appointment time." });
      }
    }

    // 4. 🔥 SMART REFUND LOGIC 🔥
    let refundIssued = false;
    const consultationFee = 100; // The standard fee we deduct

    // ONLY refund if the appointment was 'confirmed' or 'arrived' (meaning money was already cut)
    // If it is 'pending', the receptionist hasn't booked it yet, so NO money was cut.
    if (appt.status === 'confirmed' || appt.status === 'arrived') {
      await db.execute(
        `UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?`,
        [consultationFee, appt.patient_id]
      );
      refundIssued = true;
      console.log(`[REFUND] ₹${consultationFee} refunded to patient ${appt.patient_id}`);
    }

    // 5. Update the Appointment Status in the Database
    await db.execute(
      `UPDATE appointments SET status='cancelled', cancelled_by=? WHERE appointment_id=?`,
      [user_role, appointment_id]
    );

    // 6. 🔥 SEND DYNAMIC HTML EMAIL NOTIFICATION
    try {
      // Create a dynamic refund message for the email
      const refundMessageHtml = refundIssued 
        ? `<div style="background-color: #ecfdf5; padding: 12px; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 15px;">
             <p style="margin: 0; color: #065f46; font-size: 14px;"><b>💰 Refund Processed:</b> ₹${consultationFee} has been successfully refunded to your hospital wallet.</p>
           </div>`
        : `<div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #64748b; margin-top: 15px;">
             <p style="margin: 0; color: #475569; font-size: 14px;"><b>Note:</b> Because this request was still pending, no fee had been deducted from your wallet.</p>
           </div>`;

      const cancelHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin: 0;">Appointment Cancelled</h2>
          </div>
          <p>Dear <b>${appt.full_name}</b>,</p>
          <p>This email is to confirm that your scheduled appointment has been cancelled by the ${user_role}.</p>
          
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Department:</b> <span style="text-transform: capitalize;">${appt.department}</span></p>
            <p style="margin: 5px 0;"><b>Date:</b> ${new Date(appt.appointment_date).toDateString()}</p>
            <p style="margin: 5px 0;"><b>Time:</b> ${appt.appointment_time.slice(0, 5)}</p>
          </div>

          ${refundMessageHtml}

          <p style="margin-top: 20px;">If you would like to reschedule, please visit your patient portal.</p>
          <p>Best regards,<br><b>MediCare HMS Team</b></p>
        </div>
      `;

      const fallbackText = `Dear ${appt.full_name},\n\nYour appointment for ${appt.department} on ${appt.appointment_date} has been cancelled.\n${refundIssued ? '₹100 has been refunded to your wallet.' : 'No fee was deducted.'}\n\nBest regards,\nMediCare HMS Team`;

      await sendEmail({
        to: appt.email,
        subject: "Appointment Cancellation Update - MediCare HMS",
        html: cancelHtml,
        text: fallbackText
      });
      console.log("✅ Patient Cancellation & Refund Email Sent!");
    } catch (emailErr) {
      console.error("🚨 Non-fatal: Cancellation email failed", emailErr);
    }

    res.json({ 
      message: "Appointment cancelled successfully.",
      refunded: refundIssued 
    });

  } catch (err) {
    console.error("CANCEL ERROR:", err);
    res.status(500).json({ message: "Server error while cancelling appointment." });
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