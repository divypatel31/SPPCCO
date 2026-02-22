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
