const db = require("../config/db");
const bcrypt = require("bcryptjs");

/* ==============================
   7️⃣ REGISTER WALK-IN PATIENT
================================= */
exports.registerWalkInPatient = async (req, res) => {
  try {
    const { name, phone, dob, gender, address, email } = req.body;

    if (!name || !phone || !dob || !gender) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Check existing phone
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE phone = ?",
      [phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Patient already exists with this phone" });
    }

    // Default password = phone number
    const hashedPassword = await bcrypt.hash(phone, 10);

    const [result] = await db.query(
      `INSERT INTO users 
       (full_name, phone, email, password, role, dob, gender, address, status)
       VALUES (?, ?, ?, ?, 'patient', ?, ?, ?, 'active')`,
      [name, phone, email || null, hashedPassword, dob, gender, address || null]
    );

    res.status(201).json({
      message: "Patient registered successfully",
      user_id: result.insertId,
      name,
      phone
    });

  } catch (error) {
    console.error("REGISTER WALK-IN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
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
   2️⃣ ASSIGN DOCTOR
================================= */
exports.assignDoctor = async (req, res) => {
  const { appointment_id, doctor_id } = req.body;

  try {
    if (!appointment_id || !doctor_id)
      return res.status(400).json({ message: "Missing required fields" });

    // Check doctor exists & active
    const [doctorRows] = await db.query(
      "SELECT status FROM users WHERE user_id=? AND role='doctor'",
      [doctor_id]
    );

    if (doctorRows.length === 0)
      return res.status(404).json({ message: "Doctor not found" });

    if (doctorRows[0].status !== 'active')
      return res.status(400).json({ message: "Doctor is absent today" });

    // Get appointment
    // Get appointment
    const [appointmentRows] = await db.query(
      "SELECT * FROM appointments WHERE appointment_id=?",
      [appointment_id]
    );

    if (appointmentRows.length === 0)
      return res.status(404).json({ message: "Appointment not found" });

    const appointment = appointmentRows[0];


    const startTime = appointment.appointment_time;
    const appointmentDate = appointment.appointment_date;

    // Check slot conflict
    const [conflict] = await db.query(
      `SELECT * FROM appointments
       WHERE doctor_id=? 
       AND appointment_date=? 
       AND appointment_time=? 
       AND status IN ('scheduled','arrived','in_consultation')`,
      [doctor_id, appointmentDate, startTime]
    );

    if (conflict.length > 0)
      return res.status(400).json({
        message: "Doctor busy at this time. Please select another time slot."
      });

    // Assign doctor
    await db.query(
      `UPDATE appointments
       SET doctor_id=?, status='scheduled'
       WHERE appointment_id=?`,
      [doctor_id, appointment_id]
    );

    res.json({ message: "Doctor assigned successfully" });

  } catch (error) {
    console.error("ASSIGN DOCTOR ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* ==============================
   TIME HELPER FUNCTION
================================= */
function add15Minutes(time) {
  const [hour, minute] = time.split(":");
  const date = new Date();
  date.setHours(hour);
  date.setMinutes(minute);
  date.setSeconds(0);
  date.setMinutes(date.getMinutes() + 15);

  return date.toTimeString().slice(0, 5);
}

/* ==============================
   3️⃣ MARK PATIENT ARRIVED
================================= */
exports.markArrived = async (req, res) => {
  const appointment_id = req.params.id;

  try {
    const [result] = await db.query(
      "UPDATE appointments SET status = 'arrived' WHERE appointment_id = ?",
      [appointment_id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Appointment not found" });

    res.json({ message: "Patient marked as arrived" });

  } catch (error) {
    console.error("MARK ARRIVED ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ==============================
   4️⃣ GET COMPLETED APPOINTMENTS
================================= */
exports.getCompletedAppointments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM appointments 
       WHERE status = 'completed' 
       AND billing_status = 'not_generated'`
    );

    res.json(rows);
  } catch (error) {
    console.error("GET COMPLETED ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ==============================
   5️⃣ GENERATE BILL
================================= */
exports.generateBill = async (req, res) => {
  const {
    appointment_id,
    consultation_fee = 0,
    lab_charges = 0,
    medicine_charges = 0,
    other_charges = 0
  } = req.body;

  try {
    if (!appointment_id)
      return res.status(400).json({ message: "Appointment ID required" });

    const total =
      Number(consultation_fee) +
      Number(lab_charges) +
      Number(medicine_charges) +
      Number(other_charges);

    if (total <= 0)
      return res.status(400).json({ message: "Invalid bill amount" });

    // Check appointment exists
    const [appointmentRows] = await db.query(
      "SELECT * FROM appointments WHERE appointment_id = ?",
      [appointment_id]
    );

    if (appointmentRows.length === 0)
      return res.status(404).json({ message: "Appointment not found" });

    const appointment = appointmentRows[0];

    // Insert bill
    await db.query(
      `INSERT INTO bills 
       (appointment_id, patient_id, consultation_fee, lab_charges, medicine_charges, other_charges, total_amount, payment_status, generated_by, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        appointment_id,
        appointment.patient_id,
        consultation_fee,
        lab_charges,
        medicine_charges,
        other_charges,
        total,
        req.user.id // ✅ fixed
      ]
    );

    // Update appointment billing status
    await db.query(
      "UPDATE appointments SET billing_status = 'generated' WHERE appointment_id = ?",
      [appointment_id]
    );

    res.json({ message: "Bill generated successfully" });

  } catch (error) {
    console.error("GENERATE BILL ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ==============================
   6️⃣ MARK BILL PAID
================================= */
exports.markBillPaid = async (req, res) => {
  const bill_id = req.params.id;

  try {
    const [result] = await db.query(
      "UPDATE bills SET payment_status = 'paid', paid_at = NOW() WHERE bill_id = ?",
      [bill_id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Bill not found" });

    res.json({ message: "Payment updated successfully" });

  } catch (error) {
    console.error("MARK BILL PAID ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDoctorsByDepartment = async (req, res) => {
  try {
    const { department } = req.query;

    const [rows] = await db.query(
      `SELECT user_id, full_name 
       FROM users 
       WHERE role='doctor' 
       AND department = ?
       AND status='active'`,
      [department]
    );

    res.json(rows);

  } catch (err) {
    console.error("GET DOCTORS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ==============================
   GET TODAY QUEUE
================================= */
exports.getTodayQueue = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await db.query(
      `
      SELECT 
        a.appointment_id,
        a.department,
        a.appointment_date,
        a.appointment_time,
        a.status,
        p.full_name AS patient_name,
        d.full_name AS doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.user_id
      LEFT JOIN users d ON a.doctor_id = d.user_id
      WHERE a.appointment_date = ?
      AND a.status IN ('scheduled','arrived','in_consultation')
      ORDER BY a.appointment_time ASC
      `,
      [today]
    );

    res.json(rows);

  } catch (error) {
    console.error("TODAY QUEUE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.cancelAppointmentByReceptionist = async (req, res) => {
  try {
    const { appointment_id } = req.body;

    if (!appointment_id) {
      return res.status(400).json({ message: "Appointment ID required" });
    }

    await db.execute(
      `UPDATE appointments 
   SET status='cancelled', cancelled_by='receptionist'
   WHERE appointment_id=?`,
      [appointment_id]
    );

    res.json({ message: "Appointment cancelled successfully" });

  } catch (err) {
    console.error("RECEPTIONIST CANCEL ERROR:", err);
    res.status(500).json({ message: "Cancel failed" });
  }
};

exports.getQueueByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const [rows] = await db.execute(
      `SELECT 
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.cancelled_by,
        p.full_name AS patient_name,
        d.full_name AS doctor_name
       FROM appointments a
       JOIN users p ON a.patient_id = p.user_id
       LEFT JOIN users d ON a.doctor_id = d.user_id
       WHERE a.appointment_date = ?
       ORDER BY a.appointment_time ASC`,
      [date]
    );

    res.json(rows);

  } catch (err) {
    console.error("QUEUE ERROR:", err);
    res.status(500).json({ message: "Failed to load queue" });
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

    // Check existing phone 
    const [existingEmail] = await db.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE phone = ?",
      [phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Patient already exists with this phone" });
    }

    // Default password = phone number
    const hashedPassword = await bcrypt.hash(phone, 10);

    const [result] = await db.query(
      `INSERT INTO users 
   (full_name, email, phone, password_hash, role, dob, gender, address, status, created_by)
   VALUES (?, ?, ?, ?, 'patient', ?, ?, ?, 'active', 'receptionist')`,
      [
        name,
        email,
        phone,
        hashedPassword,
        dob,
        gender,
        address || null
      ]
    );

    res.status(201).json({
      message: "Patient registered successfully",
      user_id: result.insertId,
      name,
      phone
    });

  } catch (error) {
    console.error("REGISTER WALK-IN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markArrived = async (req, res) => {
  try {
    const appointment_id = req.params.id;

    const [result] = await db.query(
      "UPDATE appointments SET status = 'arrived' WHERE appointment_id = ? AND status = 'scheduled'",
      [appointment_id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Only scheduled appointments can be marked arrived" });
    }

    res.json({ message: "Patient marked as arrived" });

  } catch (error) {
    console.error("ARRIVED ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};