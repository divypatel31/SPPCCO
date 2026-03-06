const db = require("../config/db");

/* 1️⃣ GET DOCTOR APPOINTMENTS */
exports.getMyAppointments = async (req, res) => {
  try {
    const doctor_id = req.user.id;

    const [rows] = await db.execute(
      `SELECT a.*, u.full_name AS patient_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.doctor_id = ?
       ORDER BY a.appointment_date ASC`,
      [doctor_id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* 2️⃣ START CONSULTATION */
exports.startConsultation = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const appointment_id = req.params.id;

    const [rows] = await db.execute(
      `SELECT status 
       FROM appointments 
       WHERE appointment_id=? AND doctor_id=?`,
      [appointment_id, doctor_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (rows[0].status !== "arrived") {
      return res.status(400).json({
        message: "Consultation can only start after patient arrival"
      });
    }

    await db.execute(
      `UPDATE appointments 
       SET status='in_consultation'
       WHERE appointment_id=?`,
      [appointment_id]
    );

    res.json({ message: "Consultation started successfully" });

  } catch (err) {
    console.error("START ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* 3️⃣ ADD MEDICAL RECORD */
exports.addMedicalRecord = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const { appointment_id, symptoms, diagnosis, clinical_notes, follow_up_date } = req.body;

    // Get patient from appointment
    const [appointment] = await db.execute(
      "SELECT patient_id FROM appointments WHERE appointment_id=?",
      [appointment_id]
    );

    if (appointment.length === 0)
      return res.status(404).json({ message: "Appointment not found" });

    const patient_id = appointment[0].patient_id;

    await db.execute(
      `INSERT INTO medical_records
       (appointment_id, patient_id, doctor_id, symptoms, diagnosis, clinical_notes, follow_up_date)
       VALUES (?,?,?,?,?,?,?)`,
      [appointment_id, patient_id, doctor_id, symptoms, diagnosis, clinical_notes, follow_up_date]
    );

    res.json({ message: "Medical record added successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/* 4️⃣ ADD PRESCRIPTION */
exports.addPrescription = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const { appointment_id, medicines } = req.body;

    // Get patient_id
    const [appointment] = await db.execute(
      "SELECT patient_id FROM appointments WHERE appointment_id=?",
      [appointment_id]
    );

    if (appointment.length === 0)
      return res.status(404).json({ message: "Appointment not found" });

    const patient_id = appointment[0].patient_id;

    // Create prescription
    const [result] = await db.execute(
      `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id)
       VALUES (?,?,?)`,
      [appointment_id, doctor_id, patient_id]
    );

    const prescription_id = result.insertId;

    // Insert medicines
    for (let med of medicines) {
      await db.execute(
        `INSERT INTO prescription_items
   (prescription_id, medicine_id, dosage, frequency, duration,
    instructions, morning, afternoon, evening, night, food_timing)
   VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          prescription_id,
          med.medicine_id,
          med.dosage,
          med.frequency,
          med.duration,
          med.instructions,
          med.morning || 0,
          med.afternoon || 0,
          med.evening || 0,
          med.night || 0,
          med.food_timing || null
        ]
      );
    }

    res.json({ message: "Prescription added successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/* 5️⃣ RECOMMEND LAB TEST */
exports.addLabRequest = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const { appointment_id, test_name, department } = req.body;

    const [appointment] = await db.execute(
      "SELECT patient_id FROM appointments WHERE appointment_id=?",
      [appointment_id]
    );

    if (appointment.length === 0)
      return res.status(404).json({ message: "Appointment not found" });

    const patient_id = appointment[0].patient_id;

    await db.execute(
      `INSERT INTO lab_requests
       (appointment_id, patient_id, doctor_id, test_name, department)
       VALUES (?,?,?,?,?)`,
      [appointment_id, patient_id, doctor_id, test_name, department]
    );

    res.json({ message: "Lab test requested" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/* 6️⃣ COMPLETE CONSULTATION */
exports.completeConsultation = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const appointment_id = req.params.id;
    const { medicines } = req.body;

    const [rows] = await db.execute(
      `SELECT status, patient_id 
       FROM appointments 
       WHERE appointment_id=? AND doctor_id=?`,
      [appointment_id, doctor_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (rows[0].status === "completed") {
      return res.json({ message: "Already completed" });
    }

    if (rows[0].status !== "in_consultation") {
      return res.status(400).json({
        message: "Consultation must be started first"
      });
    }

    const patient_id = rows[0].patient_id;

    // 🔹 Insert prescription if medicines exist
    if (medicines && medicines.length > 0) {

      const [result] = await db.execute(
        `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id)
         VALUES (?,?,?)`,
        [appointment_id, doctor_id, patient_id]
      );

      const prescription_id = result.insertId;

      for (let med of medicines) {
        await db.execute(
          `INSERT INTO prescription_items
          (prescription_id, medicine_id, dosage, frequency, duration,
           instructions, morning, afternoon, evening, night, food_timing)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            prescription_id,
            med.medicine_id,
            med.dosage,
            med.frequency || null,
            med.duration ? Number(med.duration) : null,
            med.instructions || null,
            med.morning ? 1 : 0,
            med.afternoon ? 1 : 0,
            med.evening ? 1 : 0,
            med.night ? 1 : 0,
            med.food_timing || null
          ]
        );
      }
    }

    // 🔹 Update appointment
    await db.execute(
      `UPDATE appointments 
       SET status='completed'
       WHERE appointment_id=?`,
      [appointment_id]
    );

    res.json({ message: "Consultation completed successfully" });

  } catch (err) {
    console.error("COMPLETE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* 7️⃣ GET SINGLE APPOINTMENT */
exports.getAppointmentById = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const appointment_id = req.params.id;

    // 1️⃣ Get appointment
    const [appointmentRows] = await db.execute(
      `SELECT a.*, u.full_name AS patient_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.appointment_id=? AND a.doctor_id=?`,
      [appointment_id, doctor_id]
    );

    if (appointmentRows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const appointment = appointmentRows[0];

    // 2️⃣ Get lab results
    const [labResults] = await db.execute(
      `SELECT lr.request_id,
              lr.test_name,
              lr.status,
              lr.result
       FROM lab_requests lr
       WHERE lr.appointment_id=?`,
      [appointment_id]
    );

    // 3️⃣ Attach lab results
    appointment.lab_results = labResults;

    res.json(appointment);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* 0️⃣ DOCTOR CANCEL APPOINTMENT */
exports.cancelAppointment = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const appointment_id = req.params.id;

    const [rows] = await db.execute(
      `SELECT status 
       FROM appointments 
       WHERE appointment_id=? AND doctor_id=?`,
      [appointment_id, doctor_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (rows[0].status !== "scheduled") {
      return res.status(400).json({
        message: "Cannot cancel after patient arrived or consultation started"
      });
    }

    await db.execute(
      `UPDATE appointments 
       SET status='cancelled', cancelled_by='doctor'
       WHERE appointment_id=?`,
      [appointment_id]
    );

    res.json({ message: "Appointment cancelled successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};