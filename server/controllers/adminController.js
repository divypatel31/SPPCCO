const db = require("../config/db");

exports.getDashboardStats = async (req, res) => {
    try {
        // 🔥 NEW: Fetch dynamic fee
        const [adminRows] = await db.execute("SELECT consultation_fee FROM users WHERE role = 'admin' LIMIT 1");
        const adminFee = Number(adminRows[0]?.consultation_fee) || 0;

        // 1. Get User Counts
        const [users] = await db.execute("SELECT role, COUNT(*) as count FROM users GROUP BY role");
        let total_patients = 0, total_doctors = 0, total_receptionists = 0, total_lab_techs = 0, total_pharmacists = 0;
        
        users.forEach(u => {
            if(u.role === 'patient') total_patients = u.count;
            if(u.role === 'doctor') total_doctors = u.count;
            if(u.role === 'receptionist') total_receptionists = u.count;
            if(u.role === 'lab') total_lab_techs = u.count;
            if(u.role === 'pharmacist') total_pharmacists = u.count;
        });

        const [appointments] = await db.execute("SELECT COUNT(*) AS total_appointments FROM appointments");

        // 2. Calculate Revenue based on Wallet Deductions
        const [pharmacy] = await db.execute("SELECT SUM(total_amount) AS total FROM bills WHERE payment_status = 'paid'");
        const pharmacy_revenue = parseFloat(pharmacy[0].total) || 0;

        // 🔥 USE DYNAMIC FEE
        const [consultations] = await db.execute("SELECT COUNT(*) as count FROM appointments WHERE status IN ('arrived', 'in_consultation', 'completed')");
        const consultation_revenue = (consultations[0].count || 0) * adminFee; 

        const [labs] = await db.execute("SELECT SUM(test_price) as total FROM lab_requests");
        const lab_revenue = parseFloat(labs[0].total) || 0;

        const total_revenue = pharmacy_revenue + consultation_revenue + lab_revenue;

        // 3. Bill Counts
        const [paidBills] = await db.execute("SELECT COUNT(*) AS count FROM bills WHERE payment_status = 'paid'");
        const [pendingBills] = await db.execute("SELECT COUNT(*) AS count FROM bills WHERE payment_status = 'unpaid' OR payment_status = 'pending'");

        // 4. Today & Monthly Totals
        const [todayPharmacy] = await db.execute("SELECT SUM(total_amount) AS total FROM bills WHERE payment_status = 'paid' AND DATE(paid_at) = CURDATE()");
        const [todayConsultations] = await db.execute("SELECT COUNT(*) as count FROM appointments WHERE status IN ('arrived', 'in_consultation', 'completed') AND DATE(appointment_date) = CURDATE()");
        const [todayLabs] = await db.execute("SELECT SUM(test_price) as total FROM lab_requests WHERE DATE(created_at) = CURDATE()");
        
        // 🔥 USE DYNAMIC FEE
        const today_revenue = (parseFloat(todayPharmacy[0].total) || 0) + ((todayConsultations[0].count || 0) * adminFee) + (parseFloat(todayLabs[0].total) || 0);

        const [monthPharmacy] = await db.execute("SELECT SUM(total_amount) AS total FROM bills WHERE payment_status = 'paid' AND MONTH(paid_at) = MONTH(CURDATE())");
        const [monthConsultations] = await db.execute("SELECT COUNT(*) as count FROM appointments WHERE status IN ('arrived', 'in_consultation', 'completed') AND MONTH(appointment_date) = MONTH(CURDATE())");
        const [monthLabs] = await db.execute("SELECT SUM(test_price) as total FROM lab_requests WHERE MONTH(created_at) = MONTH(CURDATE())");

        // 🔥 USE DYNAMIC FEE
        const monthly_revenue = (parseFloat(monthPharmacy[0].total) || 0) + ((monthConsultations[0].count || 0) * adminFee) + (parseFloat(monthLabs[0].total) || 0);

        res.json({
            total_patients, total_doctors, total_receptionists, total_lab_techs, total_pharmacists,
            total_appointments: appointments[0].total_appointments,
            total_revenue,
            consultation_revenue,
            lab_revenue,
            pharmacy_revenue,
            paid_bills_count: paidBills[0].count,
            pending_bills: pendingBills[0].count,
            today_revenue,
            monthly_revenue
        });

    } catch (error) {
        console.error("DASHBOARD STATS ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getMonthlyRevenue = async (req, res) => {
    try {
        // 🔥 NEW: Fetch dynamic fee
        const [adminRows] = await db.execute("SELECT consultation_fee FROM users WHERE role = 'admin' LIMIT 1");
        const adminFee = Number(adminRows[0]?.consultation_fee) || 0;

        const [rows] = await db.execute(`
            SELECT 
                month, 
                SUM(consultation_revenue) as consultation_revenue, 
                SUM(lab_revenue) as lab_revenue, 
                SUM(pharmacy_revenue) as pharmacy_revenue
            FROM (
                SELECT DATE_FORMAT(appointment_date, '%b') as month, ? as consultation_revenue, 0 as lab_revenue, 0 as pharmacy_revenue 
                FROM appointments WHERE status IN ('arrived', 'in_consultation', 'completed')
                
                UNION ALL
                
                SELECT DATE_FORMAT(created_at, '%b') as month, 0, test_price, 0 
                FROM lab_requests
                
                UNION ALL
                
                SELECT DATE_FORMAT(paid_at, '%b') as month, 0, 0, total_amount 
                FROM bills WHERE payment_status = 'paid'
            ) as combined
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
        `, [adminFee]); // 🔥 PASS DYNAMIC FEE INTO SQL QUERY

        res.json(rows.map(r => ({
            month: r.month,
            consultation_revenue: parseFloat(r.consultation_revenue) || 0,
            lab_revenue: parseFloat(r.lab_revenue) || 0,
            pharmacy_revenue: parseFloat(r.pharmacy_revenue) || 0
        })).reverse());

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/* GET ALL STAFF USERS */
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT 
        user_id,
        full_name,
        email,
        phone,
        role,
        department,
        status,
        created_at
      FROM users
      ORDER BY created_at DESC
      `
    );

    res.json(rows);

  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Failed to load users" });
  }
};

/* UPDATE USER */
exports.updateUser = async (req, res) => {
  try {
    const { full_name, email, phone, department } = req.body;
    const userId = req.params.id;

    // 🔥 Check if email exists for another user
    const [existing] = await db.execute(
      "SELECT user_id FROM users WHERE email = ? AND user_id != ?",
      [email, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    await db.execute(
      `
      UPDATE users
      SET full_name = ?, email = ?, phone = ?, department = ?
      WHERE user_id = ?
      `,
      [full_name, email, phone, department, userId]
    );

    res.json({ message: "User updated successfully" });

  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};


/* ACTIVATE / DEACTIVATE USER */
exports.toggleUserStatus = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT status FROM users WHERE user_id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const newStatus = rows[0].status === "active" ? "inactive" : "active";

    await db.execute(
      "UPDATE users SET status = ? WHERE user_id = ?",
      [newStatus, req.params.id]
    );

    res.json({ message: `User ${newStatus}` });

  } catch (err) {
    console.error("TOGGLE STATUS ERROR:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

exports.getLabTests = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT lt.*, d.name AS department_name
      FROM lab_tests lt
      JOIN departments d ON lt.department_id = d.department_id
      ORDER BY lt.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createLabTest = async (req, res) => {
  try {
    const { name, department_id, price, description } = req.body;

    await db.query(
      "INSERT INTO lab_tests (name, department_id, price, description) VALUES (?, ?, ?, ?)",
      [name, department_id, price, description]
    );

    res.status(201).json({ message: "Lab test created" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateLabTest = async (req, res) => {
  try {
    const { name, department_id, price, description } = req.body;

    await db.query(
      `UPDATE lab_tests 
       SET name=?, department_id=?, price=?, description=? 
       WHERE lab_test_id=?`,
      [name, department_id, price, description, req.params.id]
    );

    res.json({ message: "Lab test updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleLabTestStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT status FROM lab_tests WHERE lab_test_id=?",
      [id]
    );

    const newStatus =
      rows[0].status === "active" ? "inactive" : "active";

    await db.query(
      "UPDATE lab_tests SET status=? WHERE lab_test_id=?",
      [newStatus, id]
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateConsultationFee = async (req, res) => {
  const { consultation_fee } = req.body;

  await db.query(
    "UPDATE users SET consultation_fee = ? WHERE role = 'admin'",
    [consultation_fee]
  );

  res.json({ message: "Consultation fee updated" });
};