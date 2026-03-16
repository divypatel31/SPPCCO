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

/* 3️⃣ ADD MEDICAL RECORD (🔥 FIXED FOR AUTO-SAVE) */
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

    // 🔥 Check if the medical record already exists!
    const [existingRecord] = await db.execute(
      "SELECT * FROM medical_records WHERE appointment_id = ?",
      [appointment_id]
    );

    if (existingRecord.length > 0) {
      // If it exists, UPDATE IT (This allows Auto-Save to overwrite safely)
      await db.execute(
        `UPDATE medical_records 
         SET symptoms = ?, diagnosis = ?, clinical_notes = ?, follow_up_date = ?
         WHERE appointment_id = ?`,
        [symptoms, diagnosis, clinical_notes, follow_up_date, appointment_id]
      );
    } else {
      // If it doesn't exist, INSERT IT
      await db.execute(
        `INSERT INTO medical_records
         (appointment_id, patient_id, doctor_id, symptoms, diagnosis, clinical_notes, follow_up_date)
         VALUES (?,?,?,?,?,?,?)`,
        [appointment_id, patient_id, doctor_id, symptoms, diagnosis, clinical_notes, follow_up_date]
      );
    }

    res.json({ message: "Medical record saved successfully" });

  } catch (err) {
    console.error("MEDICAL RECORD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* 4️⃣ ADD PRESCRIPTION (🔥 FIXED FOR AUTO-SAVE) */
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

    // 🔥 UPSERT LOGIC: Check if a prescription already exists
    const [existingPrescription] = await db.execute(
      "SELECT prescription_id FROM prescriptions WHERE appointment_id=?",
      [appointment_id]
    );
    
    let prescription_id;

    if (existingPrescription.length > 0) {
      prescription_id = existingPrescription[0].prescription_id;
      // Clear out the old draft items so we can insert the newly typed ones
      await db.execute("DELETE FROM prescription_items WHERE prescription_id=?", [prescription_id]);
    } else {
      // Create new prescription
      const [result] = await db.execute(
        `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id) VALUES (?,?,?)`,
        [appointment_id, doctor_id, patient_id]
      );
      prescription_id = result.insertId;
    }

    // Insert the fresh list of medicines
    if (medicines && medicines.length > 0) {
      for (let med of medicines) {
        if (!med.medicine_id) continue; // Skip empty rows

        await db.execute(
          `INSERT INTO prescription_items 
          (prescription_id, medicine_id, dose, unit, frequency, duration, morning, afternoon, evening, night, food_timing, instructions) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            prescription_id,
            med.medicine_id,
            med.dose ? Number(med.dose) : 1,
            med.unit || 'tablet',
            med.frequency ? Number(med.frequency) : 1,
            med.duration ? Number(med.duration) : 1,
            med.morning ? 1 : 0,
            med.afternoon ? 1 : 0,
            med.evening ? 1 : 0,
            med.night ? 1 : 0,
            med.food_timing || 'after_food',
            med.instructions || ''
          ]
        );
      }
    }

    res.json({ message: "Prescription saved successfully" });

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

/* 6️⃣ COMPLETE CONSULTATION (🔥 SIMPLIFIED FOR AUTO-SAVE) */
exports.completeConsultation = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const appointment_id = req.params.id;

    const [rows] = await db.execute(
      `SELECT status FROM appointments WHERE appointment_id=? AND doctor_id=?`,
      [appointment_id, doctor_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (rows[0].status === "completed") {
      return res.json({ message: "Already completed" });
    }

    if (rows[0].status !== "in_consultation") {
      return res.status(400).json({ message: "Consultation must be started first" });
    }

    // 🔹 Update appointment status (Medicines are already saved via Auto-Save!)
    await db.execute(
      `UPDATE appointments SET status='completed' WHERE appointment_id=?`,
      [appointment_id]
    );

    res.json({ message: "Consultation completed successfully" });

  } catch (err) {
    console.error("COMPLETE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* 7️⃣ GET SINGLE APPOINTMENT (🔥 FIXED TO FETCH ALL AUTO-SAVE DATA) */
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
      `SELECT lr.request_id, lr.test_name, lr.status, lr.result
       FROM lab_requests lr WHERE lr.appointment_id=?`,
      [appointment_id]
    );

    appointment.lab_results = labResults;

    // 3️⃣ Get the auto-saved medical record
    const [medicalRecords] = await db.execute(
      `SELECT symptoms, diagnosis, clinical_notes, follow_up_date 
       FROM medical_records WHERE appointment_id=?`,
      [appointment_id]
    );
    
    if (medicalRecords.length > 0) {
      appointment.medical_record = medicalRecords[0];
    }

    // 🔥 4️⃣ Get the auto-saved medicines!
    const [prescriptions] = await db.execute(
      `SELECT prescription_id FROM prescriptions WHERE appointment_id=?`, 
      [appointment_id]
    );
    
    if (prescriptions.length > 0) {
      const [items] = await db.execute(
        `SELECT * FROM prescription_items WHERE prescription_id=?`, 
        [prescriptions[0].prescription_id]
      );
      
      // Convert 1/0 back to true/false for the frontend checkboxes
      appointment.medicines = items.map(item => ({
        ...item,
        morning: item.morning === 1,
        afternoon: item.afternoon === 1,
        evening: item.evening === 1,
        night: item.night === 1
      }));
    } else {
      appointment.medicines = [];
    }

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

/* ==============================
   GET MY SCHEDULE (DOCTOR ONLY)
================================= */
exports.getMySchedule = async (req, res) => {
  try {
    const doctor_id = req.user.id; 
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const [rows] = await db.execute(
      `SELECT a.appointment_time, a.status, p.full_name as patient_name
       FROM appointments a
       JOIN users p ON a.patient_id = p.user_id
       WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status != 'cancelled'`,
      [doctor_id, date]
    );

    res.json(rows);
  } catch (error) {
    console.error("MY SCHEDULE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};