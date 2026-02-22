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
    const appointment_id = req.params.id;

    await db.execute(
      "UPDATE appointments SET status='in_consultation' WHERE appointment_id=?",
      [appointment_id]
    );

    res.json({ message: "Consultation started" });

  } catch (err) {
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
         (prescription_id, medicine_name, dosage, frequency, duration, instructions)
         VALUES (?,?,?,?,?,?)`,
        [
          prescription_id,
          med.medicine_name,
          med.dosage,
          med.frequency,
          med.duration,
          med.instructions
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
    const appointment_id = req.params.id;

    await db.execute(
      "UPDATE appointments SET status='completed' WHERE appointment_id=?",
      [appointment_id]
    );

    res.json({ message: "Consultation completed" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
