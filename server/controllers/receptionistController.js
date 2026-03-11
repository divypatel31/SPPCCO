const db = require("../config/db");
const bcrypt = require("bcryptjs");

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

    const [doctorRows] = await conn.query(
      "SELECT status FROM users WHERE user_id=? AND role='doctor'",
      [doctor_id]
    );

    if (doctorRows.length === 0) throw new Error("Doctor not found");
    if (doctorRows[0].status !== 'active') throw new Error("Doctor is absent today");

    const [appointmentRows] = await conn.query(
      "SELECT * FROM appointments WHERE appointment_id=?",
      [appointment_id]
    );

    if (appointmentRows.length === 0) throw new Error("Appointment not found");

    const appointment = appointmentRows[0];
    const patient_id = appointment.patient_id;

    const [patientRows] = await conn.query(
      "SELECT wallet_balance FROM users WHERE user_id=? FOR UPDATE",
      [patient_id]
    );

    if (patientRows[0].wallet_balance < 100) {
      throw new Error("Patient's wallet balance dropped below ₹100. Cannot assign doctor until they top up.");
    }

    const [conflict] = await conn.query(
      `SELECT * FROM appointments
       WHERE doctor_id=? 
       AND appointment_date=? 
       AND appointment_time=? 
       AND status IN ('scheduled','arrived','in_consultation')`,
      [doctor_id, appointment.appointment_date, appointment.appointment_time]
    );

    if (conflict.length > 0) throw new Error("Doctor busy at this time. Please select another time slot.");

    await conn.query(
      `UPDATE appointments
       SET doctor_id=?, status='scheduled'
       WHERE appointment_id=?`,
      [doctor_id, appointment_id]
    );

    await conn.query(
      `UPDATE users
       SET wallet_balance = wallet_balance - 100
       WHERE user_id=?`,
      [patient_id]
    );

    await conn.commit();
    res.json({ message: "Doctor assigned successfully and ₹100 fee deducted." });

  } catch (error) {
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

    // 🔥 NEW: Fetch the dynamic consultation fee set by the Admin
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

/*
  POST /api/receptionist/generate-bill
*/
exports.generateBill = async (req, res) => {
  try {
    const {
      appointment_id,
      patient_id,
      consultation_fee,
      lab_charges,
      medicine_charges,
      other_charges,
      total_amount
    } = req.body;

    const generated_by = req.user?.id || req.user?.user_id || null;

    // 🔥 CHANGED 'unpaid' to 'paid' so it unlocks the Patient's PDF immediately!
    const [billResult] = await db.execute(`
      INSERT INTO bills 
      (appointment_id, patient_id, bill_type, total_amount, payment_status, generated_by, created_at)
      VALUES (?, ?, 'consultation', ?, 'paid', ?, NOW())
    `, [appointment_id, patient_id, total_amount, generated_by]);

    const bill_id = billResult.insertId;

    try {
      if (Number(consultation_fee) > 0) {
        await db.execute("INSERT INTO bill_items (bill_id, medicine_id, quantity, price) VALUES (?, NULL, 1, ?)", [bill_id, consultation_fee]);
      }
      if (Number(lab_charges) > 0) {
        await db.execute("INSERT INTO bill_items (bill_id, medicine_id, quantity, price) VALUES (?, NULL, 1, ?)", [bill_id, lab_charges]);
      }
      if (Number(medicine_charges) > 0) {
        await db.execute("INSERT INTO bill_items (bill_id, medicine_id, quantity, price) VALUES (?, NULL, 1, ?)", [bill_id, medicine_charges]);
      }
      if (Number(other_charges) > 0) {
        await db.execute("INSERT INTO bill_items (bill_id, medicine_id, quantity, price) VALUES (?, NULL, 1, ?)", [bill_id, other_charges]);
      }
    } catch (itemErr) {
      console.log("Note: Could not insert individual items, but main bill was saved.", itemErr.message);
    }

    // Update the appointment status
    await db.execute(`
      UPDATE appointments 
      SET billing_status = 'generated' 
      WHERE appointment_id = ?
    `, [appointment_id]);

    res.status(201).json({ message: "Bill generated successfully!" });

  } catch (error) {
    console.error("🚨 GENERATE BILL CRASH:", error);
    res.status(500).json({ message: error.message || "Failed to generate bill" });
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
   7️⃣ REGISTER WALK-IN PATIENT
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

    const hashedPassword = await bcrypt.hash(phone, 10);

    const [result] = await db.query(
      `INSERT INTO users 
      (full_name, email, phone, password_hash, role, dob, gender, address, status, created_by)
      VALUES (?, ?, ?, ?, 'patient', ?, ?, ?, 'active', 'receptionist')`,
      [name, email, phone, hashedPassword, dob, gender, address || null]
    );

    res.status(201).json({ message: "Patient registered successfully", user_id: result.insertId, name, phone });
  } catch (error) {
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

    await db.execute(`UPDATE appointments SET status='cancelled', cancelled_by='receptionist' WHERE appointment_id=?`, [appointment_id]);
    res.json({ message: "Appointment cancelled successfully" });
  } catch (err) {
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