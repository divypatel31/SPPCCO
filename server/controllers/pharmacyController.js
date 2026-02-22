const db = require("../config/db");

/* Add Medicine */
exports.addMedicine = async (req, res) => {
  try {
    const {
      medicine_name,
      category,
      unit_price,
      stock,
      minimum_threshold,
      expiry_date
    } = req.body;

    if (!medicine_name || !unit_price) {
      return res.status(400).json({ message: "Medicine name and price required" });
    }

    await db.execute(
      `INSERT INTO medicines
       (name, category, price, stock, minimum_threshold, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        medicine_name,
        category || null,
        unit_price,
        stock || 0,
        minimum_threshold || 10,
        expiry_date || null
      ]
    );

    res.status(201).json({ message: "Medicine added successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Get Medicines */
exports.getMedicines = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM medicines ORDER BY created_at DESC"
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Update Medicine */
exports.updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      medicine_name,
      category,
      unit_price,
      stock,
      minimum_threshold,
      expiry_date
    } = req.body;

    await db.execute(
      `UPDATE medicines
       SET name = ?, category = ?, price = ?, stock = ?, minimum_threshold = ?, expiry_date = ?
       WHERE medicine_id = ?`,
      [
        medicine_name,
        category,
        unit_price,
        stock,
        minimum_threshold || 10,
        expiry_date || null,
        id
      ]
    );

    res.json({ message: "Medicine updated successfully" });

  } catch (error) {
    console.log(error); // 🔥 add this for debugging
    res.status(500).json({ error: error.message });
  }
};



exports.sellMedicines = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { patient_id, medicines } = req.body;
    const userId = req.user.id;

    if (!patient_id || !medicines || medicines.length === 0) {
      return res.status(400).json({ message: "Patient and medicines required" });
    }

    await connection.beginTransaction();

    let totalAmount = 0;

    // 1️⃣ Validate & calculate
    for (let item of medicines) {
      const [rows] = await connection.execute(
        "SELECT * FROM medicines WHERE medicine_id = ?",
        [item.medicine_id]
      );

      if (rows.length === 0) {
        throw new Error("Medicine not found");
      }

      const med = rows[0];

      if (med.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${med.name}`);
      }

      totalAmount += med.price * item.quantity;
    }

    // 2️⃣ Create Bill
    const [billResult] = await connection.execute(
      `INSERT INTO bills
       (appointment_id, patient_id, bill_type, generated_by, total_amount)
       VALUES (NULL, ?, 'pharmacy', ?, ?)`,
      [patient_id, userId, totalAmount]
    );

    const billId = billResult.insertId;

    // 3️⃣ Insert Bill Items & Deduct Stock
    for (let item of medicines) {
      const [rows] = await connection.execute(
        "SELECT * FROM medicines WHERE medicine_id = ?",
        [item.medicine_id]
      );

      const med = rows[0];

      // Insert bill item
      await connection.execute(
        `INSERT INTO bill_items (bill_id, description, amount)
         VALUES (?, ?, ?)`,
        [billId, `${med.name} x${item.quantity}`, med.price * item.quantity]
      );

      // Deduct stock
      await connection.execute(
        `UPDATE medicines
         SET stock = stock - ?
         WHERE medicine_id = ?`,
        [item.quantity, item.medicine_id]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: "Pharmacy bill generated successfully",
      bill_id: billId,
      total_amount: totalAmount
    });

  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM medicines WHERE stock <= 10 ORDER BY stock ASC"
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTopSellingMedicines = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        m.name,
        SUM(bi.quantity) AS total_sold,
        SUM(bi.quantity * bi.price) AS total_revenue
      FROM bill_items bi
      JOIN medicines m ON bi.medicine_id = m.medicine_id
      JOIN bills b ON bi.bill_id = b.bill_id
      WHERE b.payment_status = 'paid'
      GROUP BY m.name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    res.json(
      rows.map(r => ({
        name: r.name,
        total_sold: Number(r.total_sold),
        total_revenue: Number(r.total_revenue)
      }))
    );

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
