const db = require("../config/db");

/* GET PROFILE */
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
        user_id,
        full_name,
        email,
        phone,
        dob,
        gender,
        blood_group,
        address,
        role,
        status,
        created_at
       FROM users 
       WHERE user_id=?`,
      [req.user.id]
    );

    res.json(rows[0]);

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
};

/* UPDATE PROFILE */
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, dob, gender, blood_group, address } = req.body;
    const userId = req.user.id;

    // 🛡️ VALIDATION 1: Full Name must be letters and spaces ONLY
    if (full_name) {
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(full_name)) {
        return res.status(400).json({ message: "Full Name can only contain letters and spaces." });
      }
    }

    // 🛡️ VALIDATION 2: Phone must be exactly 10 digits
    if (phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
      }
    }

    // 🛡️ VALIDATION 3: Date of Birth cannot be a future date
    if (dob) {
      const selectedDate = new Date(dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Strip time for accurate comparison
      if (selectedDate > today) {
        return res.status(400).json({ message: "Date of Birth cannot be in the future." });
      }
    }

    await db.execute(
      `UPDATE users 
       SET 
         full_name=?,
         phone=?,
         dob=?,
         gender=?,
         blood_group=?,
         address=?
       WHERE user_id=?`,
      [
        full_name || null,
        phone || null,
        dob || null,
        gender || null,
        blood_group || null,
        address || null,
        userId
      ]
    );

    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/* GET WALLET BALANCE */
exports.getWalletBalance = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT wallet_balance FROM users WHERE user_id=?`,
      [req.user.id]
    );
    res.json({ balance: rows[0].wallet_balance || 0 });
  } catch (err) {
    console.error("WALLET ERROR:", err);
    res.status(500).json({ message: "Failed to load wallet balance" });
  }
};

/* ==============================
   ADD WALLET BALANCE (MOCK TOP-UP)
================================= */
exports.addWalletBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    const topUpAmount = Number(amount);

    // 🛡️ VALIDATION 4: Prevent negative or zero top-ups
    if (!topUpAmount || topUpAmount <= 0) {
      return res.status(400).json({ message: "Top-up amount must be a positive number greater than ₹0." });
    }

    await db.execute(
      `UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?`,
      [topUpAmount, req.user.id]
    );

    res.json({ message: `Successfully added ₹${topUpAmount} to wallet` });

  } catch (err) {
    console.error("TOP UP ERROR:", err);
    res.status(500).json({ message: "Failed to top up wallet" });
  }
};

/* =========================================
   GET MY PRESCRIPTIONS (PATIENT)
========================================= */
exports.getMyPrescriptions = async (req, res) => {
  try {
    const patient_id = req.user.id; 

    // 🔥 FIXED: Changed 'd.id' to 'd.user_id' in the JOIN clause
    const [prescriptions] = await db.execute(
      `SELECT p.prescription_id, p.created_at,
              d.full_name as doctor_name
       FROM prescriptions p
       LEFT JOIN users d ON p.doctor_id = d.user_id
       WHERE p.patient_id = ?
       ORDER BY p.created_at DESC`,
      [patient_id]
    );

    // Fetch the detailed medicine items for each prescription
    for (let presc of prescriptions) {
      const [items] = await db.execute(
        `SELECT pi.dose, pi.unit, pi.frequency, pi.duration, pi.instructions,
                pi.morning, pi.afternoon, pi.evening, pi.night, pi.food_timing,
                m.name as medicine_name, m.form, m.dispense_type, m.pack_size
         FROM prescription_items pi
         JOIN medicines m ON pi.medicine_id = m.medicine_id
         WHERE pi.prescription_id = ?`,
        [presc.prescription_id]
      );
      
      presc.medicines = items;
    }

    res.json(prescriptions);

  } catch (error) {
    console.error("GET PRESCRIPTIONS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
};

/* ==============================
   GET PATIENT LAB REPORTS
================================= */
exports.getMyLabReports = async (req, res) => {
  try {
    const { appointment_id } = req.query; // 🔥 We now accept the appointment ID from the frontend!
    
    let query = `
      SELECT lr.request_id, lr.test_name, lr.department, lr.status, lr.result, lr.updated_at,
             u.full_name as doctor_name
      FROM lab_requests lr
      JOIN users u ON lr.doctor_id = u.user_id
      WHERE lr.patient_id = ? AND lr.status = 'completed'
    `;
    const params = [req.user.id];

    // 🔥 If frontend asks for a specific bill's labs, filter it!
    if (appointment_id) {
      query += ` AND lr.appointment_id = ?`;
      params.push(appointment_id);
    }

    query += ` ORDER BY lr.updated_at DESC`;

    const [reports] = await db.execute(query, params);
    
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Failed to load lab reports" });
  }
};
