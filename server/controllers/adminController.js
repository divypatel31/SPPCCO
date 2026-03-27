const db = require("../config/db");
const bcrypt = require("bcryptjs"); // 🔥 Imported for hashing new staff passwords
const sendEmail = require('../utils/sendEmail'); // 🔥 Imported for emails

exports.getDashboardStats = async (req, res) => {
    try {
        const [adminRows] = await db.execute("SELECT consultation_fee FROM users WHERE role = 'admin' LIMIT 1");
        const adminFee = Number(adminRows[0]?.consultation_fee) || 0;

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

        const [pharmacy] = await db.execute("SELECT SUM(total_amount) AS total FROM bills WHERE payment_status = 'paid'");
        const pharmacy_revenue = parseFloat(pharmacy[0].total) || 0;

        const [consultations] = await db.execute("SELECT COUNT(*) as count FROM appointments WHERE status IN ('arrived', 'in_consultation', 'completed')");
        const consultation_revenue = (consultations[0].count || 0) * adminFee; 

        const [labs] = await db.execute("SELECT SUM(test_price) as total FROM lab_requests");
        const lab_revenue = parseFloat(labs[0].total) || 0;

        const total_revenue = pharmacy_revenue + consultation_revenue + lab_revenue;

        const [paidBills] = await db.execute("SELECT COUNT(*) AS count FROM bills WHERE payment_status = 'paid'");
        const [pendingBills] = await db.execute("SELECT COUNT(*) AS count FROM bills WHERE payment_status = 'unpaid' OR payment_status = 'pending'");

        const [todayPharmacy] = await db.execute("SELECT SUM(total_amount) AS total FROM bills WHERE payment_status = 'paid' AND DATE(paid_at) = CURDATE()");
        const [todayConsultations] = await db.execute("SELECT COUNT(*) as count FROM appointments WHERE status IN ('arrived', 'in_consultation', 'completed') AND DATE(appointment_date) = CURDATE()");
        const [todayLabs] = await db.execute("SELECT SUM(test_price) as total FROM lab_requests WHERE DATE(created_at) = CURDATE()");
        
        const today_revenue = (parseFloat(todayPharmacy[0].total) || 0) + ((todayConsultations[0].count || 0) * adminFee) + (parseFloat(todayLabs[0].total) || 0);

        const [monthPharmacy] = await db.execute("SELECT SUM(total_amount) AS total FROM bills WHERE payment_status = 'paid' AND MONTH(paid_at) = MONTH(CURDATE())");
        const [monthConsultations] = await db.execute("SELECT COUNT(*) as count FROM appointments WHERE status IN ('arrived', 'in_consultation', 'completed') AND MONTH(appointment_date) = MONTH(CURDATE())");
        const [monthLabs] = await db.execute("SELECT SUM(test_price) as total FROM lab_requests WHERE MONTH(created_at) = MONTH(CURDATE())");

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
        `, [adminFee]);

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

/* =======================================
   🔥 ADD NEW STAFF MEMBER (ADMIN ONLY)
======================================= */
exports.addStaff = async (req, res) => {
  try {
    const { full_name, email, phone, password, role, department } = req.body;

    if (!full_name || !email || !password || !phone || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (role === 'patient') {
      return res.status(400).json({ message: "Use the patient registration route for patients." });
    }

    const [existing] = await db.execute("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) return res.status(400).json({ message: "Email already exists" });

    const [existingPhone] = await db.execute("SELECT user_id FROM users WHERE phone = ?", [phone]);
    if (existingPhone.length > 0) return res.status(400).json({ message: "Phone number already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role, department, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, 'active', 'admin')`,
      [full_name, email, phone, hashedPassword, role, department || null]
    );

    // 🔥 Send Onboarding Credentials Email
    try {
      const staffWelcomeHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 600px; margin: auto;">
          <div style="text-align: center; background-color: #0f172a; padding: 20px; border-radius: 10px 10px 0 0; margin:-20px -20px 20px -20px;">
            <h2 style="color: #ffffff; margin: 0;">Welcome to the Team!</h2>
          </div>
          <p>Dear <b>${full_name}</b>,</p>
          <p>An administrative account has been created for you on the MediCare Hospital Management System.</p>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><b>Your Official Credentials:</b></p>
            <p style="margin: 5px 0;"><b>Role:</b> <span style="text-transform: capitalize;">${role}</span></p>
            <p style="margin: 5px 0;"><b>Login Email:</b> ${email}</p>
            <p style="margin: 5px 0;"><b>Temporary Password:</b> <span style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${password}</span></p>
          </div>

          <p style="color: #b91c1c; font-size: 14px;"><b>⚠️ Security Notice:</b> For security reasons, please log in and change your password immediately from your Staff Profile page.</p>
          
          <p>Best regards,<br><b>MediCare IT Administration</b></p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: "Action Required: Your MediCare System Credentials",
        html: staffWelcomeHtml,
        text: `Dear ${full_name},\nYour account has been created.\nRole: ${role}\nEmail: ${email}\nPassword: ${password}\nPlease log in and change your password immediately.`
      });
      console.log(`✅ Staff Credentials Email Sent to ${email}`);
    } catch (emailErr) {
      console.error("🚨 Non-fatal: Staff onboarding email failed", emailErr);
    }

    res.status(201).json({ message: "Staff member added and credentials emailed successfully" });

  } catch (err) {
    console.error("ADD STAFF ERROR:", err);
    res.status(500).json({ message: "Failed to add staff member" });
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

    if (full_name) {
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(full_name)) {
        return res.status(400).json({ message: "Full Name can only contain letters and spaces." });
      }
    }

    if (phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
      }
    }

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

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: "Test name is required." });
    }
    if (Number(price) <= 0) {
      return res.status(400).json({ message: "Test price must be greater than ₹0." });
    }

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

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: "Test name is required." });
    }
    if (Number(price) <= 0) {
      return res.status(400).json({ message: "Test price must be greater than ₹0." });
    }

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

  if (Number(consultation_fee) < 0) {
    return res.status(400).json({ message: "Consultation fee cannot be negative." });
  }

  await db.query(
    "UPDATE users SET consultation_fee = ? WHERE role = 'admin'",
    [consultation_fee]
  );

  res.json({ message: "Consultation fee updated" });
};

exports.getDoctorRevenue = async (req, res) => {
  try {
      const [adminRows] = await db.execute("SELECT consultation_fee FROM users WHERE role = 'admin' LIMIT 1");
      const adminFee = Number(adminRows[0]?.consultation_fee) || 0;

      const [rows] = await db.execute(`
          SELECT 
              u.full_name AS doctor_name,
              COUNT(a.appointment_id) AS total_patients,
              (COUNT(a.appointment_id) * ?) AS revenue
          FROM users u
          LEFT JOIN appointments a ON u.user_id = a.doctor_id 
              AND a.status IN ('arrived', 'in_consultation', 'completed')
          WHERE u.role = 'doctor'
          GROUP BY u.user_id, u.full_name
          ORDER BY revenue DESC
      `, [adminFee]);

      res.json(rows.map(r => ({
          doctor_name: r.doctor_name,
          total_patients: Number(r.total_patients),
          revenue: Number(r.revenue)
      })));
  } catch (error) {
      console.error("DOCTOR REVENUE ERROR:", error);
      res.status(500).json({ message: "Failed to fetch doctor revenue" });
  }
};

exports.getConsultationFee = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT consultation_fee FROM users WHERE role = 'admin' LIMIT 1");
    
    res.json({ fee: rows[0]?.consultation_fee || 0 });
  } catch (error) {
    console.error("GET FEE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch current fee" });
  }
};

exports.deleteLabTest = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      "DELETE FROM lab_tests WHERE lab_test_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lab test not found" });
    }

    res.json({ message: "Lab test deleted successfully" });

  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        message: "Cannot delete! This lab test has already been prescribed to patients." 
      });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId == req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const [result] = await db.execute("DELETE FROM users WHERE user_id = ?", [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ message: "Cannot delete user. They have active records (appointments, bills, etc.) tied to them. Please Deactivate them instead." });
    }
    res.status(500).json({ message: "Failed to delete user" });
  }
};