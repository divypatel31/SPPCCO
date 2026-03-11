const db = require("../config/db");

/* =========================
   CREATE LAB REQUEST & DEDUCT WALLET (Doctor)
========================= */
exports.createLabRequest = async (req, res) => {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const doctorId = req.user.id;
        const { appointment_id, test_name, department, test_price } = req.body;

        if (!appointment_id || !test_name || !test_price) {
            throw new Error("Missing required fields");
        }

        // 1. Get patient_id from appointment
        const [appointment] = await conn.execute(
            "SELECT patient_id FROM appointments WHERE appointment_id = ?",
            [appointment_id]
        );

        if (appointment.length === 0) {
            throw new Error("Invalid appointment");
        }

        const patient_id = appointment[0].patient_id;
        const labFee = Number(test_price);

        // 2. Check Patient Wallet Balance
        const [patientRows] = await conn.execute(
            "SELECT wallet_balance FROM users WHERE user_id=? FOR UPDATE",
            [patient_id]
        );

        if (patientRows[0].wallet_balance < labFee) {
            throw new Error(`Insufficient wallet balance. ₹${labFee} required for ${test_name}. Ask patient to top up.`);
        }

        // 3. Deduct the Lab Fee from the wallet
        await conn.execute(
            "UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id=?",
            [labFee, patient_id]
        );

        // 4. Insert Lab Request
        await conn.execute(
            `INSERT INTO lab_requests
             (appointment_id, patient_id, doctor_id, test_name, department, test_price)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [appointment_id, patient_id, doctorId, test_name, department || null, labFee]
        );

        await conn.commit();
        res.status(201).json({ message: `Lab request sent. ₹${labFee} deducted from patient wallet.` });

    } catch (error) {
        await conn.rollback();
        console.error("LAB REQUEST ERROR:", error);
        res.status(400).json({ message: error.message || "Server error" });
    } finally {
        conn.release();
    }
};

/* =========================
   GET LAB REQUESTS (Lab)
========================= */
exports.getLabRequests = async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM lab_requests ORDER BY created_at DESC"
        );

        res.json(rows);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.completeLabTest = async (req, res) => {
    try {
        const { id } = req.params;
        const { result } = req.body;

        if (!result) {
            return res.status(400).json({ message: "Result is required" });
        }

        await db.execute(
            `UPDATE lab_requests
        SET status = 'completed',
            result = ?,
            billing_status = 'ready'
        WHERE request_id = ?`,
            [result, id]
        );


        res.json({ message: "Lab test completed successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
/* =========================
   GET COMPLETED LAB TESTS (Receptionist)
========================= */
exports.getCompletedLabTests = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT *
             FROM lab_requests
             WHERE status = 'completed'
             AND billing_status = 'billed'
             ORDER BY created_at DESC`
        );

        res.json(rows);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.generateLabBill = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const receptionistId = req.user.id;

        // 1️⃣ Get lab request
        const [rows] = await connection.execute(
            "SELECT * FROM lab_requests WHERE request_id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Lab request not found" });
        }

        const lab = rows[0];

        if (lab.status !== "completed") {
            return res.status(400).json({ message: "Lab test not completed" });
        }

        await connection.beginTransaction();

        // 2️⃣ Insert bill
        const [billResult] = await connection.execute(
            `INSERT INTO bills
             (appointment_id, patient_id, bill_type, generated_by, total_amount)
             VALUES (?, ?, 'lab', ?, ?)`,
            [lab.appointment_id, lab.patient_id, receptionistId, lab.test_price]
        );

        const billId = billResult.insertId;

        // 3️⃣ Insert bill item
        await connection.execute(
            `INSERT INTO bill_items (bill_id, description, amount)
             VALUES (?, ?, ?)`,
            [billId, lab.test_name, lab.test_price]
        );

        // 4️⃣ Update lab request billing_status
        await connection.execute(
            `UPDATE lab_requests
             SET billing_status = 'billed'
             WHERE request_id = ?`,
            [id]
        );
        
        if (lab.billing_status === "billed") {
            return res.status(400).json({ message: "Bill already generated for this lab request" });
        }

        await connection.commit();

        res.status(201).json({
            message: "Lab bill generated successfully",
            bill_id: billId
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};
