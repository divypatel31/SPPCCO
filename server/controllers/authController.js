const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require('../utils/sendEmail');

// 🔥 STRONG PASSWORD REGEX & MESSAGE
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
const weakPasswordMsg = "Password is weak! It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (e.g., @$!%*?&).";

/* =========================
   REGISTER USER (ANY ROLE)
========================= */
exports.register = async (req, res) => {
  try {
    // 🔥 FIXED: Added dob, gender, and address to be extracted from req.body
    const { name, email, phone, password, role, dob, gender, address } = req.body;

    // 🛡️ 1. Required Fields Check
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Full name, email, phone, and password are required" });
    }

    // 🛡️ 2. Name Validation: Only letters and spaces
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({ message: "Full name can only contain letters and spaces" });
    }

    // 🛡️ 3. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // 🛡️ 4. Phone Validation: Exactly 10 digits
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    // 🛡️ 5. STRONG PASSWORD VALIDATION
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({ message: weakPasswordMsg });
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

    // 🔥 FIXED: Added dob, gender, and address to the INSERT query
    await db.execute(
      `INSERT INTO users 
      (full_name, email, phone, password_hash, role, status, created_by, dob, gender, address)
      VALUES (?, ?, ?, ?, ?, 'active', 'self', ?, ?, ?)`,
      [name, email, phone, hashedPassword, userRole, dob || null, gender || null, address || null]
    );

    res.status(201).json({
      message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} registered successfully`
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

    // 🔥 NEW: Prevent database crashes from extremely long inputs
    if (email.length > 255 || password.length > 255) {
      return res.status(400).json({ message: "Invalid input length. Please try again." });
    }

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Wrong email entered. User not found." });
    }

    const user = rows[0];

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account disabled" });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ message: "Wrong password entered. Please try again." });
    }

    // First time login check
    if (password === user.phone && user.role === 'patient') {
      return res.status(200).json({
        requirePasswordChange: true,
        user_id: user.user_id,
        phone: user.phone,
        message: "First time login: Please set a secure password."
      });
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
    // 🔥 FIXED: Changed 'error' to 'message' so the frontend can read it!
    res.status(500).json({ message: "Server error during login. Please try again." });
  }
};

/* =========================
   CHANGE PASSWORD
========================= */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide current and new password" });
    }

    // 🔥 THE NEW CHECK: Prevent using the same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "Your new password cannot be the same as your old password. Please enter a different one."
      });
    }

    // 🛡️ STRONG PASSWORD VALIDATION
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({ message: weakPasswordMsg });
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

/* =========================================
   FORCE CHANGE PASSWORD (First Time Login)
========================================= */
exports.forceChangePassword = async (req, res) => {
  try {
    const { user_id, new_password } = req.body;

    if (!user_id || !new_password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🛡️ STRONG PASSWORD VALIDATION
    if (!strongPasswordRegex.test(new_password)) {
      return res.status(400).json({ message: weakPasswordMsg });
    }

    // Hash the new secure password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update the database
    const [result] = await db.execute(
      `UPDATE users SET password_hash = ? WHERE user_id = ?`,
      [hashedPassword, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Password updated successfully! You can now log in." });
  } catch (error) {
    console.error("FORCE CHANGE PWD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* =========================
   GET MY PROFILE
========================= */
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

/* =========================================
   FORGOT PASSWORD: Send OTP to Email
========================================= */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.execute(
      "UPDATE users SET reset_otp = ?, otp_expiry = ? WHERE email = ?",
      [otp, expiry, email]
    );

    const message = `Your password reset OTP is: ${otp}\nThis code is valid for 15 minutes.\nIf you did not request this, please ignore this email.`;

    const uniqueSubject = `Password Reset OTP - MediCare HMS (${new Date().toLocaleTimeString()})`;

    // 🔥 ADD AWAIT HERE:
    await sendEmail({
      to: email,
      subject: uniqueSubject,
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

    // 🛡️ STRONG PASSWORD VALIDATION
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({ message: weakPasswordMsg });
    }

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