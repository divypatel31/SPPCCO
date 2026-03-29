const db = require("../config/db");
const bcrypt = require("bcryptjs");
const sendEmail = require('../utils/sendEmail');

/* ==============================
   1️⃣ GET PENDING APPOINTMENTS
================================= */
exports.getPendingAppointments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        a.appointment_id,
        a.patient_id,
        a.department,
        a.appointment_date,
        a.appointment_time,
        a.status,
        u.full_name AS patient_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.status = 'pending'
       ORDER BY a.appointment_date ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error("GET PENDING ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ==============================
   2️⃣ ASSIGN DOCTOR & CUT MONEY
================================= */
exports.assignDoctor = async (req, res) => {
  const { appointment_id, doctor_id } = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    if (!appointment_id || !doctor_id) throw new Error("Missing required fields");

    // 1. Check Doctor Availability
    const [doctorRows] = await conn.query(
      "SELECT status, full_name FROM users WHERE user_id=? AND role='doctor'",
      [doctor_id]
    );

    if (doctorRows.length === 0) throw new Error("Doctor not found");
    if (doctorRows[0].status !== 'active') throw new Error("Doctor is absent today");

    const doctorName = doctorRows[0].full_name;

    // 2. Check Appointment and Patient Email
    const [appointmentRows] = await conn.query(
      `SELECT a.*, u.email as patient_email, u.full_name as patient_name 
       FROM appointments a 
       JOIN users u ON a.patient_id = u.user_id 
       WHERE a.appointment_id=?`,
      [appointment_id]
    );

    if (appointmentRows.length === 0) throw new Error("Appointment not found");

    const appointment = appointmentRows[0];
    const patient_id = appointment.patient_id;

    // 3. Wallet Balance Check (FOR UPDATE locks the row)
    const [patientRows] = await conn.query(
      "SELECT wallet_balance FROM users WHERE user_id=? FOR UPDATE",
      [patient_id]
    );

    if (patientRows[0].wallet_balance < 100) {
      throw new Error("Patient's wallet balance dropped below ₹100. Cannot assign doctor until they top up.");
    }

    // 4. Time Conflict Check
    const [conflict] = await conn.query(
      `SELECT * FROM appointments
       WHERE doctor_id=? 
       AND appointment_date=? 
       AND appointment_time=? 
       AND status IN ('scheduled','arrived','in_consultation')`,
      [doctor_id, appointment.appointment_date, appointment.appointment_time]
    );

    if (conflict.length > 0) throw new Error("Doctor busy at this time. Please select another time slot.");

    // 5. Execute Database Updates
    await conn.query(
      `UPDATE appointments SET doctor_id=?, status='scheduled' WHERE appointment_id=?`,
      [doctor_id, appointment_id]
    );

    await conn.query(
      `UPDATE users SET wallet_balance = wallet_balance - 100 WHERE user_id=?`,
      [patient_id]
    );

    // 🔥 Successfully save the transaction to the database
    await conn.commit();

    // 6. Trigger Email Notification (Protected by Try/Catch!)
    if (appointment.patient_email) {
      const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #8b5cf6;">Appointment Confirmed!</h2>
        <p>Dear <b>${appointment.patient_name}</b>,</p>
        <p>Your appointment has been successfully scheduled and a doctor has been assigned.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
          <p style="margin: 5px 0;"><b>Doctor:</b> Dr. ${doctorName}</p>
          <p style="margin: 5px 0;"><b>Department:</b> ${appointment.department || 'General Medicine'}</p>
          <p style="margin: 5px 0;"><b>Date:</b> ${new Date(appointment.appointment_date).toDateString()}</p>
          <p style="margin: 5px 0;"><b>Time Slot:</b> ${appointment.appointment_time.slice(0, 5)}</p>
          <p style="margin: 5px 0;"><b>Status:</b> Confirmed (₹100 Paid)</p>
        </div>

        <p style="margin-top: 20px;">Please arrive at the hospital 10 minutes before your time.</p>
        <p>Best regards,<br><b>MediCare HMS Team</b></p>
      </div>
    `;

      // 🔥 Wrap the email API call to protect the success response
      try {
        await sendEmail({
          to: appointment.patient_email,
          subject: `Appointment Confirmed - Dr. ${doctorName}`,
          html: emailHtml
        });
      } catch (emailErr) {
        console.error("🚨 Non-fatal: Assignment confirmation email failed to send", emailErr);
      }
    }

    res.json({ message: "Doctor assigned successfully and ₹100 fee deducted." });

  } catch (error) {
    // Only roll back if the actual database queries failed, not the email
    await conn.rollback();
    console.error("ASSIGN DOCTOR ERROR:", error);
    res.status(error.message.includes("Patient") || error.message.includes("Missing") ? 400 : 500)
      .json({ message: error.message || "Server error" });
  } finally {
    conn.release();
  }
};

/* ==============================
   3️⃣ MARK PATIENT ARRIVED & CUT DYNAMIC CONSULTATION FEE
================================= */
exports.markArrived = async (req, res) => {
  const appointment_id = req.params.id;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Fetch the dynamic consultation fee set by the Admin
    const [adminRows] = await conn.query("SELECT consultation_fee FROM users WHERE role = 'admin' LIMIT 1");
    const CONSULTATION_FEE = Number(adminRows[0]?.consultation_fee) || 0;

    const [apptRows] = await conn.query(
      "SELECT patient_id, status FROM appointments WHERE appointment_id = ?",
      [appointment_id]
    );

    if (apptRows.length === 0) throw new Error("Appointment not found");
    if (apptRows[0].status !== 'scheduled') throw new Error("Only scheduled appointments can be marked arrived");

    const patient_id = apptRows[0].patient_id;

    // Check Wallet Balance
    const [patientRows] = await conn.query(
      "SELECT wallet_balance FROM users WHERE user_id = ? FOR UPDATE",
      [patient_id]
    );

    if (patientRows[0].wallet_balance < CONSULTATION_FEE) {
      throw new Error(`Insufficient wallet balance. ₹${CONSULTATION_FEE} required for Doctor Consultation. Ask patient to top up.`);
    }

    // Deduct dynamic fee
    await conn.query(
      "UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?",
      [CONSULTATION_FEE, patient_id]
    );

    // Update appointment status
    await conn.query(
      "UPDATE appointments SET status = 'arrived' WHERE appointment_id = ?",
      [appointment_id]
    );

    await conn.commit();
    res.json({ message: `Patient marked as arrived. ₹${CONSULTATION_FEE} deducted from wallet.` });

  } catch (error) {
    await conn.rollback();
    console.error("ARRIVED ERROR:", error);
    res.status(400).json({ message: error.message || "Server error" });
  } finally {
    conn.release();
  }
};

/* ==============================
   4️⃣ GET COMPLETED APPOINTMENTS
================================= */
exports.getCompletedAppointments = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        a.appointment_id,
        a.appointment_date,
        a.status,
        a.billing_status,
        p.full_name AS patient_name,
        p.user_id AS patient_id,
        d.full_name AS doctor_name,
        
        -- 1. Fixed Consultation Fee
        500 AS consultation_fee, 
        
        -- 2. Auto-Sum Lab Charges
        (SELECT COALESCE(SUM(test_price), 0) 
         FROM lab_requests 
         WHERE appointment_id = a.appointment_id) AS lab_charges,
         
        -- 3. Auto-Sum Pharmacy Charges
        (SELECT COALESCE(SUM(total_amount), 0) 
         FROM bills 
         WHERE appointment_id = a.appointment_id AND bill_type = 'pharmacy') AS medicine_charges

      FROM appointments a
      JOIN users p ON a.patient_id = p.user_id
      JOIN users d ON a.doctor_id = d.user_id
      WHERE a.status = 'completed'
      ORDER BY a.appointment_date DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("FETCH APPOINTMENTS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   5️⃣ GENERATE BILL
================================= */
exports.generateBill = async (req, res) => {
  const conn = await db.getConnection(); // 🔥 Using a strict transaction
  try {
    await conn.beginTransaction();

    const {
      appointment_id,
      patient_id,
      consultation_fee,
      lab_charges,
      total_amount
    } = req.body;

    if (!appointment_id) throw new Error("Appointment ID is missing");

    const generated_by = req.user?.id || req.user?.user_id || null;

    // Create the Main Bill
    const [billResult] = await conn.execute(`
      INSERT INTO bills 
      (appointment_id, patient_id, bill_type, total_amount, payment_status, generated_by, created_at)
      VALUES (?, ?, 'consultation', ?, 'paid', ?, NOW())
    `, [appointment_id, patient_id, total_amount, generated_by]);

    const bill_id = billResult.insertId;

    if (Number(consultation_fee) > 0) {
      await conn.execute(
        "INSERT INTO bill_items (bill_id, quantity, price, description) VALUES (?, 1, ?, 'Consultation Fee')",
        [bill_id, consultation_fee]
      );
    }
    if (Number(lab_charges) > 0) {
      await conn.execute(
        "INSERT INTO bill_items (bill_id, quantity, price, description) VALUES (?, 1, ?, 'Laboratory Charges')",
        [bill_id, lab_charges]
      );
    }

    // Update the appointment status
    const [updateResult] = await conn.execute(`
      UPDATE appointments 
      SET billing_status = 'generated' 
      WHERE appointment_id = ?
    `, [appointment_id]);

    // 🔥 Safety Check: Ensure the update actually changed a row!
    if (updateResult.affectedRows === 0) {
      throw new Error("Failed to update appointment. ID mismatch.");
    }

    await conn.commit();
    res.status(201).json({ message: "Bill generated successfully!" });

  } catch (error) {
    await conn.rollback();
    console.error("🚨 GENERATE BILL CRASH:", error);
    res.status(500).json({ message: error.message || "Failed to generate bill" });
  } finally {
    conn.release();
  }
};
/* ==============================
   6️⃣ MARK BILL PAID
================================= */
exports.markBillPaid = async (req, res) => {
  const bill_id = req.params.id;
  try {
    const [result] = await db.query("UPDATE bills SET payment_status = 'paid', paid_at = NOW() WHERE bill_id = ?", [bill_id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Bill not found" });
    res.json({ message: "Payment updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ==============================
   REGISTER WALK-IN PATIENT
================================= */
exports.registerWalkInPatient = async (req, res) => {
  try {
    const { name, phone, dob, gender, address, email } = req.body;

    if (!name || !phone || !email || !dob || !gender) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const [existingEmail] = await db.query("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existingEmail.length > 0) return res.status(400).json({ message: "Email already exists" });

    const [existing] = await db.query("SELECT user_id FROM users WHERE phone = ?", [phone]);
    if (existing.length > 0) return res.status(400).json({ message: "Patient already exists with this phone" });

    // 🔥 SETTING DEFAULT PASSWORD TO PHONE NUMBER
    const defaultPassword = phone;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const [result] = await db.query(
      `INSERT INTO users 
      (full_name, email, phone, password_hash, role, dob, gender, address, status, created_by)
      VALUES (?, ?, ?, ?, 'patient', ?, ?, ?, 'active', 'receptionist')`,
      [name, email, phone, hashedPassword, dob, gender, address || null]
    );

    // 🔥 SEND WELCOME EMAIL (With Spam Filter Bypass)
    try {
      const welcomeHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0;">Welcome to MediCare HMS!</h2>
          </div>
          <p>Dear <b>${name}</b>,</p>
          <p>You have been successfully registered at our hospital reception desk.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><b>Your Patient Portal Login:</b></p>
            <p style="margin: 5px 0;"><b>Email:</b> ${email}</p>
            <p style="margin: 5px 0;"><b>Temporary Password:</b> ${phone}</p>
          </div>

          <p style="color: #b91c1c; font-size: 14px;"><b>⚠️ Security Notice:</b> Please log in to your patient portal and change your password immediately.</p>
          <p>Best regards,<br><b>The MediCare Team</b></p>
        </div>
      `;

      // 🔥 The crucial fallback text that guarantees Brevo accepts the email
      const fallbackText = `Dear ${name},\n\nYou have been successfully registered at our hospital reception desk.\n\nYour Patient Portal Login:\nEmail: ${email}\nTemporary Password: ${phone}\n\nPlease log in and change your password immediately.\n\nBest regards,\nThe MediCare Team`;

      await sendEmail({
        to: email,
        subject: "Welcome to MediCare HMS - Hospital Registration",
        html: welcomeHtml,
        text: fallbackText
      });
      console.log("✅ Walk-in Patient Welcome Email Sent");
    } catch (emailErr) {
      console.error("🚨 Non-fatal: Walk-in Welcome email failed", emailErr);
    }

    res.status(201).json({
      message: "Patient registered! Ask them to login using their phone number as the password.",
      user_id: result.insertId,
      name,
      phone
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ==============================
   8️⃣ OTHER HELPER FUNCTIONS
================================= */
exports.getDoctorsByDepartment = async (req, res) => {
  try {
    const { department } = req.query;
    const [rows] = await db.query(
      `SELECT user_id, full_name FROM users WHERE role='doctor' AND department = ? AND status='active'`,
      [department]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTodayQueue = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await db.query(
      `SELECT a.appointment_id, a.department, a.appointment_date, a.appointment_time, a.status, p.full_name AS patient_name, d.full_name AS doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.user_id
      LEFT JOIN users d ON a.doctor_id = d.user_id
      WHERE a.appointment_date = ? AND a.status IN ('scheduled','arrived','in_consultation')
      ORDER BY a.appointment_time ASC`,
      [today]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.cancelAppointmentByReceptionist = async (req, res) => {
  try {
    const { appointment_id } = req.body;
    if (!appointment_id) return res.status(400).json({ message: "Appointment ID required" });

    // 1. Fetch details needed for the email before cancelling
    const [details] = await db.execute(
      `SELECT a.appointment_date, a.appointment_time, u.email as patient_email, u.full_name as patient_name 
       FROM appointments a 
       JOIN users u ON a.patient_id = u.user_id 
       WHERE a.appointment_id=?`,
      [appointment_id]
    );

    if (details.length === 0) {
      return res.status(404).json({ message: "Appointment details not found" });
    }

    const appt = details[0];

    // 2. Perform the cancellation update
    await db.execute(
      `UPDATE appointments SET status='cancelled', cancelled_by='receptionist' WHERE appointment_id=?`,
      [appointment_id]
    );

    // 3. Send Cancellation Email
    if (appt.patient_email) {
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #ef4444; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Appointment Cancelled</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="color: #334155; font-size: 16px; margin-top: 0;">Dear <strong>${appt.patient_name}</strong>,</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">This is an automated notice to inform you that your scheduled appointment has been <b>cancelled</b> by our reception desk.</p>
            
            <div style="background-color: #fff1f2; border: 1px solid #fecaca; padding: 20px; border-radius: 12px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 15px;">📅 <strong>Date:</strong> ${new Date(appt.appointment_date).toLocaleDateString('en-IN')}</p>
              <p style="margin: 0; color: #991b1b; font-size: 15px;">⏰ <strong>Time:</strong> ${appt.appointment_time ? appt.appointment_time.slice(0, 5) : 'N/A'}</p>
            </div>
            
            <p style="color: #475569; font-size: 14px; margin-bottom: 0;">If you would like to reschedule, please log into your patient portal or contact our support team.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">MediCare Hospital Management System</p>
          </div>
        </div>
      `;

      // 🔥 Wrapped in try...catch so a failed email won't crash the frontend response!
      try {
        await sendEmail({
          to: appt.patient_email,
          subject: "Notice: Appointment Cancellation - MediCare HMS",
          html: emailHtml
        });
      } catch (emailErr) {
        console.error("🚨 Non-fatal: Receptionist cancellation email failed to send", emailErr);
      }
    }

    res.json({ message: "Appointment cancelled and patient notified." });
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    res.status(500).json({ message: "Cancel failed" });
  }
};

exports.getQueueByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });

    const [rows] = await db.execute(
      `SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status, a.cancelled_by, p.full_name AS patient_name, d.full_name AS doctor_name
       FROM appointments a
       JOIN users p ON a.patient_id = p.user_id
       LEFT JOIN users d ON a.doctor_id = d.user_id
       WHERE a.appointment_date = ? ORDER BY a.appointment_time ASC`,
      [date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to load queue" });
  }
};

/* ==============================
   9️⃣ GET ALL DOCTORS & SCHEDULE
================================= */
exports.getAllDoctors = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id, full_name, department FROM users WHERE role='doctor' AND status='active'`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDoctorSchedule = async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    const [rows] = await db.query(
      `SELECT a.appointment_time, a.status, p.full_name as patient_name
       FROM appointments a
       JOIN users p ON a.patient_id = p.user_id
       WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status != 'cancelled'`,
      [doctor_id, date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ==============================
   GET CONSULTATION FEE (For Billing)
================================= */
exports.getConsultationFee = async (req, res) => {
  try {
    // Fetch the dynamic fee set by the admin
    const [rows] = await db.query("SELECT consultation_fee FROM users WHERE role = 'admin' LIMIT 1");
    res.json({ fee: rows[0]?.consultation_fee || 0 });
  } catch (error) {
    console.error("GET FEE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};