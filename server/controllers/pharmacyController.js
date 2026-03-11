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
  const { prescription_id, medicines } = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    if (!prescription_id) throw new Error("Prescription ID is required");
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      throw new Error("No medicines provided");
    }

    // 1️⃣ Get patient info
    const [rows] = await conn.execute(`
      SELECT a.patient_id, a.appointment_id
      FROM prescriptions p
      JOIN appointments a ON p.appointment_id = a.appointment_id
      WHERE p.prescription_id = ?
    `, [prescription_id]);

    if (rows.length === 0) throw new Error("Prescription not found");
    
    const patient_id = rows[0].patient_id;
    const appointment_id = rows[0].appointment_id;
    const generated_by = req.user.id;

    // 2️⃣ Pre-calculate total amount to check wallet FIRST
    let finalTotal = 0;
    const dispenseItems = []; // Temporarily store items until we confirm wallet balance

    for (let med of medicines) {
      const requestedQty = Number(med.quantity_dispensed ?? med.quantity_required) || 0;
      if (!med.medicine_id || requestedQty <= 0) continue;

      const [stockRows] = await conn.execute(
        `SELECT stock, price FROM medicines WHERE medicine_id = ?`,
        [med.medicine_id]
      );

      if (stockRows.length === 0) continue;

      const stock = Number(stockRows[0].stock);
      const price = Number(stockRows[0].price);
      
      const dispenseQty = Math.min(requestedQty, stock);
      if (dispenseQty <= 0) continue;

      finalTotal += (dispenseQty * price);
      dispenseItems.push({ medicine_id: med.medicine_id, dispenseQty, price });
    }

    if (finalTotal === 0) {
      throw new Error("No medicines could be dispensed (out of stock or invalid data).");
    }

    // 3️⃣ Check wallet balance BEFORE creating the bill
    const [patientRows] = await conn.execute(
      "SELECT wallet_balance FROM users WHERE user_id = ? FOR UPDATE",
      [patient_id]
    );

    if (patientRows[0].wallet_balance < finalTotal) {
      throw new Error(`Insufficient wallet balance. Total pharmacy bill is ₹${finalTotal}, but patient has ₹${patientRows[0].wallet_balance}. Ask patient to top up.`);
    }

    // 4️⃣ Deduct money from wallet
    await conn.execute(
      "UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?",
      [finalTotal, patient_id]
    );

    // 5️⃣ Create the bill (Marked as PAID immediately since wallet was charged)
    const [billResult] = await conn.execute(`
      INSERT INTO bills 
      (appointment_id, patient_id, bill_type, generated_by, total_amount, payment_status, paid_at)
      VALUES (?, ?, 'pharmacy', ?, ?, 'paid', NOW())
    `, [appointment_id, patient_id, generated_by, finalTotal]);

    const bill_id = billResult.insertId;

    // 6️⃣ Insert items and update stock securely
    for (let item of dispenseItems) {
      await conn.execute(`
        INSERT INTO bill_items (bill_id, medicine_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [bill_id, item.medicine_id, item.dispenseQty, item.price]);

      await conn.execute(`
        UPDATE medicines SET stock = stock - ? WHERE medicine_id = ?
      `, [item.dispenseQty, item.medicine_id]);
    }

    // 7️⃣ Update appointment
    await conn.execute(`
      UPDATE appointments SET status = 'completed' WHERE appointment_id = ?
    `, [appointment_id]);

    await conn.commit();

    res.json({
      message: `Medicines dispensed successfully. ₹${finalTotal} automatically deducted from patient's wallet.`,
      bill_id: bill_id,
      total_amount: finalTotal
    });

  } catch (err) {
    await conn.rollback();
    console.error("SELL ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to dispense medicines" });
  } finally {
    conn.release();
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


exports.getPendingPrescriptions = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        p.prescription_id,
        p.appointment_id,
        a.patient_id,
        u.full_name AS patient_name,
        d.full_name AS doctor_name,
        p.created_at,
        (SELECT COUNT(*) FROM prescription_items WHERE prescription_id = p.prescription_id) AS item_count
      FROM prescriptions p
      JOIN appointments a ON p.appointment_id = a.appointment_id
      JOIN users u ON a.patient_id = u.user_id
      JOIN users d ON a.doctor_id = d.user_id
      LEFT JOIN bills b ON b.appointment_id = a.appointment_id AND b.bill_type = 'pharmacy'
      WHERE a.status = 'completed' 
        AND b.bill_id IS NULL
      HAVING item_count > 0 
      ORDER BY p.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET PENDING PRESCRIPTIONS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.cancelPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🔥 FIXED: Since there is no 'status' column, we simply delete the prescription 
    // if the patient never showed up. This keeps the database clean.
    
    // First, delete the items to prevent foreign key constraint errors
    await db.execute("DELETE FROM prescription_items WHERE prescription_id = ?", [id]);
    
    // Then, delete the prescription itself
    await db.execute("DELETE FROM prescriptions WHERE prescription_id = ?", [id]);
    
    res.json({ message: "Prescription successfully removed due to no-show." });
    
  } catch (error) {
    console.error("CANCEL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPrescriptionItems = async (req, res) => {
  try {
    const id = req.params.id;

    const [items] = await db.execute(`
      SELECT 
        pi.medicine_id,
        m.name AS medicine_name,
        m.price AS unit_price,
        m.stock,
        pi.morning,
        pi.afternoon,
        pi.evening,
        pi.night,
        pi.duration
      FROM prescription_items pi
      JOIN medicines m ON pi.medicine_id = m.medicine_id
      WHERE pi.prescription_id = ?
    `, [id]);
    const formatted = items.map(item => {
      const tabletsPerDay =
        (item.morning || 0) +
        (item.afternoon || 0) +
        (item.evening || 0) +
        (item.night || 0);

      const numberOfDays = Number(item.duration) || 1;

      const totalQuantity = tabletsPerDay * numberOfDays;

      return {
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        unit_price: item.unit_price,
        stock: item.stock,
        quantity_required: totalQuantity
      };
    });

    res.json(formatted);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPharmacyBills = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        b.bill_id,
        b.patient_id,
        u.full_name AS patient_name,
        b.bill_type,
        b.total_amount,
        b.payment_status,
        b.payment_method,
        b.created_at
      FROM bills b
      JOIN users u ON b.patient_id = u.user_id
      WHERE b.bill_type = 'pharmacy'
      ORDER BY b.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Bills Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.markBillPaid = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute(`
      UPDATE bills
      SET 
        payment_status = 'paid',
        paid_at = NOW()
      WHERE bill_id = ?
        AND bill_type = 'pharmacy'
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({ message: "Bill marked as paid successfully" });

  } catch (err) {
    console.error("MARK BILL PAID ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};