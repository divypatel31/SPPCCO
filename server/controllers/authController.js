const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require('../utils/sendEmail');

/* =========================
   REGISTER USER (ANY ROLE)
========================= */
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Full name, email and password are required" });
    }

    // Check existing email
    const [existing] = await db.execute(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default role = patient
    const userRole = role || "patient";
    const phoneValue = phone || null;

    await db.execute(
      `INSERT INTO users 
      (full_name, email, phone, password_hash, role, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'active', 'self')`,
      [name, email, phoneValue, hashedPassword, userRole]
    );



    res.status(201).json({
      message: `${userRole} registered successfully`
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


/* =========================
   LOGIN
========================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account disabled" });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        role: user.role
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide current and new password" });
    }

    // 1. Fetch user's current hashed password
    const [users] = await db.execute(
      "SELECT password_hash FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    // 2. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    // 3. Hash new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.execute(
      "UPDATE users SET password_hash = ? WHERE user_id = ?",
      [hashedNewPassword, userId]
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT user_id, full_name, email, phone, role, dob, gender, address, department, status, created_at 
       FROM users 
       WHERE user_id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ... [Your existing login, register, getMyProfile, changePassword code] ...

/* =========================================
   FORGOT PASSWORD: Send OTP to Email
========================================= */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Check if user exists
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 3. Set expiry to 15 minutes from now
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // 4. Save OTP to database
    await db.execute(
      "UPDATE users SET reset_otp = ?, otp_expiry = ? WHERE email = ?",
      [otp, expiry, email]
    );

    // 5. Send Email
    const message = `Your password reset OTP is: ${otp}\nThis code is valid for 15 minutes.\nIf you did not request this, please ignore this email.`;
    
    await sendEmail({
      to: email,
      subject: 'Password Reset OTP - MediCare HMS',
      text: message
    });

    res.json({ message: "OTP sent to email successfully" });

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Error sending email. Please try again later." });
  }
};

/* =========================================
   VERIFY OTP: Check if OTP is valid
========================================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ? AND reset_otp = ?", 
      [email, otp]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if OTP is expired
    const user = users[0];
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    res.json({ message: "OTP Verified" });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================
   RESET PASSWORD: Save the new password
========================================= */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // 1. Verify OTP one last time for security
    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ? AND reset_otp = ?", 
      [email, otp]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = users[0];
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    // 2. Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update password and clear OTP fields
    await db.execute(
      `UPDATE users 
       SET password_hash = ?, reset_otp = NULL, otp_expiry = NULL 
       WHERE email = ?`,
      [hashedNewPassword, email]
    );

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};