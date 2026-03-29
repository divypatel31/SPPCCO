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
      expiry_date,
      form,
      unit,
      pack_size,
      dispense_type
    } = req.body;

    // 🛡️ VALIDATION 1: Medicine name must be text
    if (!medicine_name || typeof medicine_name !== 'string' || medicine_name.trim() === '') {
      return res.status(400).json({ message: "Medicine name is required and must be text." });
    }

    // 🛡️ VALIDATION 2: Price must be a positive number greater than zero
    if (Number(unit_price) <= 0) {
      return res.status(400).json({ message: "Unit price must be greater than ₹0." });
    }

    // 🛡️ VALIDATION 3: Stock and thresholds cannot be negative
    if (Number(stock) < 0 || Number(minimum_threshold) < 0) {
      return res.status(400).json({ message: "Stock quantity and threshold cannot be negative." });
    }

    // 🛡️ VALIDATION 4: Expiry Date must not be in the past
    if (expiry_date) {
      const expDate = new Date(expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Strip time for accurate day comparison
      if (expDate < today) {
        return res.status(400).json({ message: "Expiry date must be a valid future date." });
      }
    }

    await db.execute(
      `INSERT INTO medicines
       (name, category, price, stock, minimum_threshold, expiry_date, form, unit, pack_size, dispense_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        medicine_name,
        category || null,
        unit_price,
        stock || 0,
        minimum_threshold || 10,
        expiry_date || null,
        form || 'Tablet',                   // Default to Tablet
        unit || 'mg',                       // Default to mg
        pack_size ? Number(pack_size) : 1,  // Default to 1 pack size
        dispense_type || 'UNIT'             // Default to UNIT
      ]
    );

    res.status(201).json({ message: "Medicine added successfully" });

  } catch (error) {
    console.error("ADD MEDICINE ERROR:", error);
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

/* Update Medicine (🔥 FIXED: Now includes form, unit, pack_size, dispense_type) */
exports.updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      medicine_name,
      category,
      unit_price,
      stock,
      minimum_threshold,
      expiry_date,
      form,
      unit,
      pack_size,
      dispense_type
    } = req.body;

    if (!medicine_name || typeof medicine_name !== 'string' || medicine_name.trim() === '') {
      return res.status(400).json({ message: "Medicine name is required and must be text." });
    }

    if (Number(unit_price) <= 0) {
      return res.status(400).json({ message: "Unit price must be greater than ₹0." });
    }

    if (Number(stock) < 0 || Number(minimum_threshold) < 0) {
      return res.status(400).json({ message: "Stock quantity and threshold cannot be negative." });
    }

    if (expiry_date) {
      const expDate = new Date(expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      if (expDate < today) {
        return res.status(400).json({ message: "Expiry date must be a valid future date." });
      }
    }

    await db.execute(
      `UPDATE medicines
       SET name = ?, category = ?, price = ?, stock = ?, minimum_threshold = ?, expiry_date = ?,
           form = ?, unit = ?, pack_size = ?, dispense_type = ?
       WHERE medicine_id = ?`,
      [
        medicine_name,
        category,
        unit_price,
        stock,
        minimum_threshold || 10,
        expiry_date || null,
        form || 'Tablet',
        unit || 'mg',
        pack_size ? Number(pack_size) : 1,
        dispense_type || 'UNIT',
        id
      ]
    );

    res.json({ message: "Medicine updated successfully" });

  } catch (error) {
    console.error("UPDATE MEDICINE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* Sell Medicines */
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
    const dispenseItems = []; 

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

/* 🔥 FIXED: Now fetches ALL data so the frontend can do the Smart Math! */
exports.getPrescriptionItems = async (req, res) => {
  try {
    const id = req.params.id;

    // Fetch every single detail needed for dispensing math
    const [items] = await db.execute(`
      SELECT 
        pi.medicine_id,
        m.name AS medicine_name,
        m.price AS unit_price,
        m.stock,
        m.form,
        m.pack_size,
        m.dispense_type,
        pi.dose,
        pi.unit,
        pi.frequency,
        pi.duration,
        pi.morning,
        pi.afternoon,
        pi.evening,
        pi.night,
        pi.instructions
      FROM prescription_items pi
      JOIN medicines m ON pi.medicine_id = m.medicine_id
      WHERE pi.prescription_id = ?
    `, [id]);
    
    // We NO LONGER calculate 'quantity_required' in the backend. 
    // We pass the raw data straight to the frontend's Smart Calculator.
    res.json(items);

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

/* ==========================================
   GET BILL DETAILS (ITEMS INSIDE A BILL)
========================================== */
exports.getBillDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [items] = await db.execute(`
      SELECT 
        bi.quantity, 
        bi.price, 
        m.name AS medicine_name,
        (bi.quantity * bi.price) AS total_price
      FROM bill_items bi
      JOIN medicines m ON bi.medicine_id = m.medicine_id
      WHERE bi.bill_id = ?
    `, [id]);

    res.json(items);
  } catch (err) {
    console.error("GET BILL DETAILS ERROR:", err);
    res.status(500).json({ message: "Failed to load bill items" });
  }
};

/* ==========================================
   DELETE MEDICINE
========================================== */
exports.deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      "DELETE FROM medicines WHERE medicine_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.json({ message: "Medicine deleted successfully" });

  } catch (error) {
    console.error("DELETE MEDICINE ERROR:", error);
    
    // 🛡️ SAFETY CHECK: If the medicine is linked to an old bill or prescription, SQL blocks it.
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ 
        message: "Cannot delete! This medicine has already been prescribed to patients or sold in bills. Please update its stock to 0 instead." 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};