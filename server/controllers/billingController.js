const db = require("../config/db");

exports.generateBill = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const receptionistId = req.user.id;
    const { appointment_id, items, bill_type } = req.body;

    if (!appointment_id || !items || items.length === 0) {
      return res.status(400).json({
        message: "Appointment and bill items are required"
      });
    }

    if (!["consultation", "lab", "pharmacy"].includes(bill_type)) {
      return res.status(400).json({
        message: "Invalid bill type"
      });
    }

    // 1️⃣ Check appointment exists
    const [appointments] = await connection.execute(
      "SELECT * FROM appointments WHERE appointment_id = ?",
      [appointment_id]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const appointment = appointments[0];

    if (appointment.status !== "completed") {
      return res.status(400).json({
        message: "Appointment must be completed before billing"
      });
    }

    // 🚨 Prevent duplicate billing
    if (appointment.billing_status === "generated") {
      return res.status(400).json({
        message: "Bill already generated for this appointment"
      });
    }

    await connection.beginTransaction();

    // 2️⃣ Insert bill with bill_type
    const [billResult] = await connection.execute(
      `INSERT INTO bills 
       (appointment_id, patient_id, generated_by, bill_type, payment_status)
       VALUES (?, ?, ?, ?, 'unpaid')`,
      [
        appointment_id,
        appointment.patient_id,
        receptionistId,
        bill_type
      ]
    );

    const billId = billResult.insertId;
    let total = 0;

    // 3️⃣ Insert bill items safely
    for (const item of items) {

      if (!item.description || isNaN(item.amount)) {
        throw new Error("Invalid bill item format");
      }

      const amount = parseFloat(item.amount);

      if (amount <= 0) {
        throw new Error("Item amount must be greater than zero");
      }

      total += amount;

      await connection.execute(
        `INSERT INTO bill_items (bill_id, description, amount)
         VALUES (?, ?, ?)`,
        [billId, item.description, amount]
      );
    }

    if (total <= 0) {
      throw new Error("Total amount cannot be zero");
    }

    // 4️⃣ Update total
    await connection.execute(
      `UPDATE bills SET total_amount = ? WHERE bill_id = ?`,
      [total, billId]
    );

    // 5️⃣ Lock appointment billing
    await connection.execute(
      `UPDATE appointments 
       SET billing_status = 'generated'
       WHERE appointment_id = ?`,
      [appointment_id]
    );

    await connection.commit();

    res.status(201).json({
      message: "Bill generated successfully",
      bill_id: billId,
      total_amount: total
    });

  } catch (error) {
    await connection.rollback();
    console.error("BILL ERROR:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

/*
POST /api/billing/generate-lab/:appointmentId
Generate lab bill for completed tests
*/
exports.generateLabBill = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const receptionistId = req.user.id;
    const { appointmentId } = req.params;

    await connection.beginTransaction();

    // 1️⃣ Get completed & ready lab tests
    const [labTests] = await connection.execute(
      `SELECT * FROM lab_requests
       WHERE appointment_id = ?
       AND status = 'completed'
       AND billing_status = 'ready'`,
      [appointmentId]
    );

    if (!labTests.length) {
      return res.status(400).json({
        message: "No completed lab tests ready for billing"
      });
    }

    const patientId = labTests[0].patient_id;

    // 2️⃣ Create bill
    const [billResult] = await connection.execute(
      `INSERT INTO bills
       (appointment_id, patient_id, bill_type, generated_by)
       VALUES (?, ?, 'lab', ?)`,
      [appointmentId, patientId, receptionistId]
    );

    const billId = billResult.insertId;
    let total = 0;

    // 3️⃣ Insert each test as bill item
    for (const test of labTests) {
      const price = parseFloat(test.test_price);
      total += price;

      await connection.execute(
        `INSERT INTO bill_items (bill_id, description, amount)
         VALUES (?, ?, ?)`,
        [billId, test.test_name, price]
      );

      // mark lab test as billed
      await connection.execute(
        `UPDATE lab_requests
         SET billing_status = 'billed'
         WHERE request_id = ?`,
        [test.request_id]
      );
    }

    // 4️⃣ Update total
    await connection.execute(
      `UPDATE bills SET total_amount = ? WHERE bill_id = ?`,
      [total, billId]
    );

    await connection.commit();

    res.status(201).json({
      message: "Lab bill generated successfully",
      bill_id: billId,
      total_amount: total
    });

  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.markBillPaid = async (req, res) => {
  try {
    const { bill_id, payment_method } = req.body;

    const [bills] = await db.execute(
      "SELECT * FROM bills WHERE bill_id = ?",
      [bill_id]
    );

    if (!bills.length) {
      return res.status(404).json({ message: "Bill not found" });
    }

    const bill = bills[0];

    if (bill.payment_status === "paid") {
      return res.status(400).json({ message: "Bill already paid" });
    }

    await db.execute(
      `UPDATE bills
       SET payment_status = 'paid',
           payment_method = ?,
           paid_at = NOW()
       WHERE bill_id = ?`,
      [payment_method, bill_id]
    );

    res.json({ message: "Payment marked as paid" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markBillAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method } = req.body;

    if (!payment_method) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    // Check bill exists
    const [rows] = await db.execute(
      "SELECT * FROM bills WHERE bill_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Bill not found" });
    }

    const bill = rows[0];

    if (bill.payment_status === "paid") {
      return res.status(400).json({ message: "Bill already paid" });
    }

    // Update bill
    await db.execute(
      `UPDATE bills
       SET payment_status = 'paid',
           payment_method = ?,
           paid_at = NOW()
       WHERE bill_id = ?`,
      [payment_method, id]
    );

    res.json({ message: "Bill marked as paid successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPatientBills = async (req, res) => {
  try {
    const patientId = req.user.user_id || req.user.id;

    if (!patientId) {
      return res.status(400).json({ message: "Invalid patient session" });
    }

    // 1. Fetch the main bills
    const [bills] = await db.execute(
      `SELECT bill_id, appointment_id, bill_type, total_amount, 
              payment_status, payment_method, paid_at, created_at
       FROM bills WHERE patient_id = ? ORDER BY bill_id DESC`,
      [patientId]
    );

    // 2. Fetch items for each bill
    for (let bill of bills) {
      if (bill.bill_type === 'pharmacy') {
        // JOIN with medicines table to get the name
        const [items] = await db.execute(
          `SELECT m.name AS item_name, bi.quantity, bi.price 
           FROM bill_items bi
           JOIN medicines m ON bi.medicine_id = m.medicine_id
           WHERE bi.bill_id = ?`,
          [bill.bill_id]
        );
        bill.items = items;
      } else {
        // For Lab or Consultation, bill_items might not have a medicine_id
        // We fetch whatever is in bill_items or return empty
        const [items] = await db.execute(
          `SELECT description AS item_name, amount AS price, 1 AS quantity 
           FROM bill_items WHERE bill_id = ?`,
          [bill.bill_id]
        ).catch(() => [[]]); // Catch error if columns don't exist for these types
        
        bill.items = items.length > 0 ? items : [];
      }
    }

    res.json(bills);

  } catch (error) {
    console.error("GET PATIENT BILLS ERROR:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.getRevenueSummary = async (req, res) => {
  try {
    const [total] = await db.execute(
      `SELECT 
        SUM(total_amount) AS total_revenue,
        COUNT(*) AS total_bills
       FROM bills
       WHERE payment_status = 'paid'`
    );

    const [unpaid] = await db.execute(
      `SELECT 
        SUM(total_amount) AS unpaid_amount,
        COUNT(*) AS unpaid_bills
       FROM bills
       WHERE payment_status = 'unpaid'`
    );

    res.json({
      paid_summary: total[0],
      unpaid_summary: unpaid[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRevenueByDate = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        message: "From and To dates are required"
      });
    }

    const [rows] = await db.execute(
      `SELECT 
          SUM(total_amount) AS total_revenue,
          COUNT(*) AS total_bills
       FROM bills
       WHERE payment_status = 'paid'
       AND DATE(paid_at) BETWEEN ? AND ?`,
      [from, to]
    );

    res.json(rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMonthlyRevenue = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
         DATE_FORMAT(paid_at, '%Y-%m') AS month,
         SUM(total_amount) AS total
       FROM bills
       WHERE payment_status = 'paid'
       GROUP BY month
       ORDER BY month ASC`
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTopSellingMedicines = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
          description,
          SUM(amount) AS total_sales
       FROM bill_items
       INNER JOIN bills ON bills.bill_id = bill_items.bill_id
       WHERE bills.bill_type = 'pharmacy'
       GROUP BY description
       ORDER BY total_sales DESC
       LIMIT 5`
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
