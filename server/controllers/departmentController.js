const db = require("../config/db");

exports.getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM departments ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Department name required" });
    }

    await db.execute(
      "INSERT INTO departments (name, description) VALUES (?, ?)",
      [name, description || null]
    );

    res.status(201).json({ message: "Department created successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE DEPARTMENT
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    await db.execute(
      "UPDATE departments SET name = ?, description = ? WHERE department_id = ?",
      [name, description, id]
    );

    res.json({ message: "Department updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// DEACTIVATE DEPARTMENT
exports.toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "SELECT status FROM departments WHERE department_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    const newStatus = rows[0].status === "active" ? "inactive" : "active";

    await db.execute(
      "UPDATE departments SET status = ? WHERE department_id = ?",
      [newStatus, id]
    );

    res.json({ message: `Department ${newStatus}` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActiveDepartments = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT department_id, name
      FROM departments
      WHERE status = 'active'
      ORDER BY name ASC
    `);

    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE DEPARTMENT
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      "DELETE FROM departments WHERE department_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ message: "Department deleted successfully" });

  } catch (error) {
    // 🔥 Database safety check: if doctors/tests belong to this department
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        message: "Cannot delete! This department is currently linked to existing doctors or lab tests." 
      });
    }
    res.status(500).json({ error: error.message });
  }
};