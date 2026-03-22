const db = require("../config/db");
const sendEmail = require('../utils/sendEmail');

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

    const [appointment] = await db.execute(
      "SELECT patient_id FROM appointments WHERE appointment_id=?",
      [appointment_id]
    );

    if (appointment.length === 0)
      return res.status(404).json({ message: "Appointment not found" });

    const patient_id = appointment[0].patient_id;

    const [existingRecord] = await db.execute(
      "SELECT * FROM medical_records WHERE appointment_id = ?",
      [appointment_id]
    );

    if (existingRecord.length > 0) {
      await db.execute(
        `UPDATE medical_records 
         SET symptoms = ?, diagnosis = ?, clinical_notes = ?, follow_up_date = ?
         WHERE appointment_id = ?`,
        [symptoms, diagnosis, clinical_notes, follow_up_date, appointment_id]
      );
    } else {
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

/* 4️⃣ ADD PRESCRIPTION */
exports.addPrescription = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const { appointment_id, medicines } = req.body;

    const [appointment] = await db.execute(
      "SELECT patient_id FROM appointments WHERE appointment_id=?",
      [appointment_id]
    );

    if (appointment.length === 0)
      return res.status(404).json({ message: "Appointment not found" });

    const patient_id = appointment[0].patient_id;

    const [existingPrescription] = await db.execute(
      "SELECT prescription_id FROM prescriptions WHERE appointment_id=?",
      [appointment_id]
    );
    
    let prescription_id;

    if (existingPrescription.length > 0) {
      prescription_id = existingPrescription[0].prescription_id;
      await db.execute("DELETE FROM prescription_items WHERE prescription_id=?", [prescription_id]);
    } else {
      const [result] = await db.execute(
        `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id) VALUES (?,?,?)`,
        [appointment_id, doctor_id, patient_id]
      );
      prescription_id = result.insertId;
    }

    if (medicines && medicines.length > 0) {
      for (let med of medicines) {
        if (!med.medicine_id) continue; 

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

/* 6️⃣ COMPLETE CONSULTATION (FIXED: FORCE-SAVES NOTES & MEDICINES) */
exports.completeConsultation = async (req, res) => {
  try {
    const doctor_id = req.user.id || req.user.user_id;
    const appointment_id = req.params.id;
    
    // 🔥 We now grab the notes and medicines sent from the Complete button!
    const { symptoms, diagnosis, notes, follow_up, medicines } = req.body;

    const [rows] = await db.execute(
      `SELECT status, patient_id FROM appointments WHERE appointment_id=? AND doctor_id=?`,
      [appointment_id, doctor_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (rows[0].status === "completed") {
      return res.json({ message: "Already completed" });
    }

    const patient_id = rows[0].patient_id;

    // 🔥 1. FORCE SAVE MEDICAL RECORDS BEFORE COMPLETING
    if (symptoms || diagnosis || notes) {
      const [existingRecord] = await db.execute(
        "SELECT * FROM medical_records WHERE appointment_id = ?",
        [appointment_id]
      );

      if (existingRecord.length > 0) {
        await db.execute(
          `UPDATE medical_records 
           SET symptoms = ?, diagnosis = ?, clinical_notes = ?, follow_up_date = ?
           WHERE appointment_id = ?`,
          [symptoms || '', diagnosis || '', notes || '', follow_up || null, appointment_id]
        );
      } else {
        await db.execute(
          `INSERT INTO medical_records
           (appointment_id, patient_id, doctor_id, symptoms, diagnosis, clinical_notes, follow_up_date)
           VALUES (?,?,?,?,?,?,?)`,
          [appointment_id, patient_id, doctor_id, symptoms || '', diagnosis || '', notes || '', follow_up || null]
        );
      }
    }

    // 🔥 2. FORCE SAVE PRESCRIPTIONS BEFORE COMPLETING
    if (medicines && medicines.length > 0) {
      const [existingRx] = await db.execute("SELECT prescription_id FROM prescriptions WHERE appointment_id=?", [appointment_id]);
      let prescription_id;

      if (existingRx.length > 0) {
        prescription_id = existingRx[0].prescription_id;
        await db.execute("DELETE FROM prescription_items WHERE prescription_id=?", [prescription_id]);
      } else {
        const [result] = await db.execute(
          `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id) VALUES (?,?,?)`,
          [appointment_id, doctor_id, patient_id]
        );
        prescription_id = result.insertId;
      }

      for (let med of medicines) {
        if (!med.medicine_id) continue;
        await db.execute(
          `INSERT INTO prescription_items 
          (prescription_id, medicine_id, dose, unit, frequency, duration, morning, afternoon, evening, night, food_timing, instructions) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [prescription_id, med.medicine_id, med.dose || 1, med.unit || 'tablet', med.frequency || 1, med.duration || 1, med.morning, med.afternoon, med.evening, med.night, med.food_timing, med.instructions || '']
        );
      }
    }

    // 3. FINALLY, MARK APPOINTMENT AS COMPLETED
    await db.execute(
      `UPDATE appointments SET status='completed' WHERE appointment_id=?`,
      [appointment_id]
    );

    res.json({ message: "Consultation completed and records saved successfully!" });

  } catch (err) {
    console.error("COMPLETE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* 7️⃣ GET SINGLE APPOINTMENT (FAIL-SAFE VERSION) */
exports.getAppointmentById = async (req, res) => {
  try {
    const doctor_id = req.user.id || req.user.user_id;
    const appointment_id = req.params.id;

    if (!doctor_id) {
      return res.status(401).json({ message: "Unauthorized: Doctor ID missing" });
    }

    // 1. Get the Main Appointment (If this fails, the appointment doesn't exist)
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

    // Set defaults so the React frontend never crashes!
    appointment.lab_results = [];
    appointment.medical_record = null;
    appointment.medicines = [];

    // 2. SAFELY Fetch Lab Results (Uses SELECT * to avoid missing column crashes)
    try {
      const [labResults] = await db.execute(
        `SELECT * FROM lab_requests WHERE appointment_id=?`,
        [appointment_id]
      );
      appointment.lab_results = labResults;
    } catch (labErr) {
      console.error("⚠️ Lab results fetch error:", labErr.message);
    }

    // 3. SAFELY Fetch Medical Records (Uses SELECT *)
    try {
      const [medicalRecords] = await db.execute(
        `SELECT * FROM medical_records WHERE appointment_id=?`,
        [appointment_id]
      );
      if (medicalRecords.length > 0) {
        appointment.medical_record = medicalRecords[0];
      }
    } catch (medErr) {
      console.error("⚠️ Medical records fetch error:", medErr.message);
    }

    // 4. SAFELY Fetch Prescriptions
    try {
      const [prescriptions] = await db.execute(
        `SELECT prescription_id FROM prescriptions WHERE appointment_id=?`, 
        [appointment_id]
      );
      
      if (prescriptions.length > 0) {
        const [items] = await db.execute(
          `SELECT * FROM prescription_items WHERE prescription_id=?`, 
          [prescriptions[0].prescription_id]
        );
        
        appointment.medicines = items.map(item => ({
          ...item,
          morning: item.morning === 1,
          afternoon: item.afternoon === 1,
          evening: item.evening === 1,
          night: item.night === 1
        }));
      }
    } catch (rxErr) {
      console.error("⚠️ Prescription fetch error:", rxErr.message);
    }

    // Send the safe data back to React
    res.json(appointment);

  } catch (err) {
    console.error("GET APPOINTMENT FATAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* 8️⃣ CANCEL APPOINTMENT */
exports.cancelAppointment = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const appointment_id = req.params.id;

    // 1. Fetch status AND patient details needed for the email
    const [rows] = await db.execute(
      `SELECT a.status, a.appointment_date, a.appointment_time, 
              u.email AS patient_email, u.full_name AS patient_name 
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.appointment_id=? AND a.doctor_id=?`,
      [appointment_id, doctor_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const appt = rows[0];

    // 2. Validation: Only scheduled appointments can be cancelled by doctor
    if (appt.status !== "scheduled") {
      return res.status(400).json({
        message: "Cannot cancel after patient arrived or consultation started"
      });
    }

    // 3. Perform database update
    await db.execute(
      `UPDATE appointments 
       SET status='cancelled', cancelled_by='doctor'
       WHERE appointment_id=?`,
      [appointment_id]
    );

    // 4. Send Cancellation Email to Patient
    if (appt.patient_email) {
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #ef4444; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Appointment Cancelled</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="color: #334155; font-size: 16px; margin-top: 0;">Dear <strong>${appt.patient_name}</strong>,</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">We regret to inform you that your upcoming appointment has been <b>cancelled by the doctor</b> due to unforeseen clinical circumstances.</p>
            
            <div style="background-color: #fff1f2; border: 1px solid #fecaca; padding: 20px; border-radius: 12px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 15px;">📅 <strong>Original Date:</strong> ${new Date(appt.appointment_date).toLocaleDateString('en-IN')}</p>
              <p style="margin: 0; color: #991b1b; font-size: 15px;">⏰ <strong>Original Time:</strong> ${appt.appointment_time ? appt.appointment_time.slice(0, 5) : 'N/A'}</p>
            </div>
            
            <p style="color: #475569; font-size: 14px; margin-bottom: 0;">Please log into your patient portal to book a new slot or contact the hospital reception for assistance.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">MediCare Hospital Management System</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: appt.patient_email,
        subject: "Urgent: Appointment Cancellation - MediCare HMS",
        html: emailHtml
      });
    }

    res.json({ message: "Appointment cancelled and patient notified via email." });

  } catch (err) {
    console.error("DOCTOR CANCEL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* 9️⃣ GET MY SCHEDULE */
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

/* 10. GET PATIENT PAST HISTORY WITH LABS AND MEDICINES */
exports.getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const currentApptId = req.query.current_appt;

    // 1. Fetch appointments & medical records
    const [history] = await db.execute(
      `SELECT a.appointment_id, a.appointment_date, 
              d.full_name AS doctor_name, d.department,
              m.symptoms, m.diagnosis, m.clinical_notes
       FROM appointments a
       JOIN users d ON a.doctor_id = d.user_id
       LEFT JOIN medical_records m ON a.appointment_id = m.appointment_id
       WHERE a.patient_id = ? AND a.status = 'completed' AND a.appointment_id != ?
       ORDER BY a.appointment_date DESC`,
      [patientId, currentApptId || 0]
    );

    // 2. Loop through history and attach lab results AND medicines!
    for (let record of history) {
      // Fetch Labs
      const [labs] = await db.execute(
         `SELECT * FROM lab_requests WHERE appointment_id = ?`,
         [record.appointment_id]
      );
      record.lab_results = labs;

      // Fetch Prescribed Medicines
      const [prescriptions] = await db.execute(
        `SELECT prescription_id FROM prescriptions WHERE appointment_id = ?`,
        [record.appointment_id]
      );
      
      if (prescriptions.length > 0) {
        // We use JOIN to get the actual medicine name from the medicines table
        const [meds] = await db.execute(
          `SELECT pi.*, m.name as medicine_name 
           FROM prescription_items pi
           JOIN medicines m ON pi.medicine_id = m.medicine_id
           WHERE pi.prescription_id = ?`,
          [prescriptions[0].prescription_id]
        );
        record.medicines = meds;
      } else {
        record.medicines = [];
      }
    }

    res.json(history);
  } catch (err) {
    console.error("HISTORY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};