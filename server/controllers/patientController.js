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