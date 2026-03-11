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
        dob || null,            // ✅ FIX HERE
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

    if (!topUpAmount || topUpAmount <= 0) {
      return res.status(400).json({ message: "Please enter a valid amount" });
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

/* ==============================
   GET PATIENT PRESCRIPTIONS
================================= */
exports.getMyPrescriptions = async (req, res) => {
  try {
    const patient_id = req.user.id;
    
    // 1. Fetch the main prescription records
    const [prescriptions] = await db.execute(`
      SELECT p.prescription_id, p.created_at, u.full_name as doctor_name
      FROM prescriptions p
      JOIN users u ON p.doctor_id = u.user_id
      WHERE p.patient_id = ?
      ORDER BY p.created_at DESC
    `, [patient_id]);

    // 2. Fetch the specific medicines for each prescription
    for (let presc of prescriptions) {
      const [medicines] = await db.execute(`
        SELECT pi.dosage, pi.frequency, pi.duration, pi.instructions,
               pi.morning, pi.afternoon, pi.evening, pi.night, pi.food_timing,
               m.name as medicine_name
        FROM prescription_items pi
        JOIN medicines m ON pi.medicine_id = m.medicine_id
        WHERE pi.prescription_id = ?
      `, [presc.prescription_id]);
      
      presc.medicines = medicines;
    }

    res.json(prescriptions);

  } catch (err) {
    console.error("GET PRESCRIPTIONS ERROR:", err);
    res.status(500).json({ message: "Failed to load prescriptions" });
  }
};

/* ==============================
   GET PATIENT LAB REPORTS
================================= */
exports.getMyLabReports = async (req, res) => {
  try {
    const [reports] = await db.execute(`
      SELECT lr.request_id, lr.test_name, lr.department, lr.status, lr.result, lr.updated_at,
             u.full_name as doctor_name
      FROM lab_requests lr
      JOIN users u ON lr.doctor_id = u.user_id
      WHERE lr.patient_id = ? AND lr.status = 'completed'
      ORDER BY lr.updated_at DESC
    `, [req.user.id]);
    
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Failed to load lab reports" });
  }
};