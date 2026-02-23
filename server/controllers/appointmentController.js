const db = require("../config/db");

/* BOOK APPOINTMENT */
exports.bookAppointment = async (req, res) => {
  try {
    const { department, appointment_date, start_time } = req.body;
    const patient_id = req.user.id;

    if (!department || !appointment_date || !start_time) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Check duplicate slot
    const [existing] = await db.execute(
      `
      SELECT appointment_id
      FROM appointments
      WHERE department = ?
      AND appointment_date = ?
      AND appointment_time = ?
      AND status != 'cancelled'
      `,
      [department, appointment_date, start_time]
    );

    const now = new Date();

    const todayString = now.toISOString().split("T")[0];

    if (appointment_date === todayString) {

      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      if (start_time < currentTime) {
        return res.status(400).json({ message: "Cannot book past time slot" });
      }
    }

    // 7 day restriction
    const maxDateObj = new Date();
    maxDateObj.setDate(now.getDate() + 7);

    const maxDateString = maxDateObj.toISOString().split("T")[0];

    if (appointment_date > maxDateString) {
      return res.status(400).json({ message: "Can only book within 7 days" });
    }


    if (existing.length > 0) {
      return res.status(400).json({
        message: "This slot is already booked. Please choose another."
      });
    }

    await db.execute(
      `INSERT INTO appointments
       (patient_id, department, appointment_date, appointment_time, status)
       VALUES (?,?,?,?,?)`,
      [patient_id, department, appointment_date, start_time, "pending"]
    );

    res.status(201).json({ message: "Appointment booked successfully" });

  } catch (err) {
    console.error("BOOK ERROR:", err);
    res.status(500).json({ message: "Booking failed" });
  }
};


/* MY APPOINTMENTS */
exports.myAppointments = async (req, res) => {
  try {
    const patient_id = req.user.id;

    const [rows] = await db.execute(
      `
      SELECT 
        a.appointment_id,
        a.department,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.cancelled_by,
        u.full_name AS doctor_name
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.user_id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC
      `,
      [patient_id]
    );

    res.json(rows);

  } catch (err) {
    console.error("MY APPOINTMENTS ERROR:", err);
    res.status(500).json({ message: "Failed to load appointments" });
  }
};


/* CANCEL APPOINTMENT */
exports.cancelAppointment = async (req, res) => {
  try {
    const patient_id = req.user.id;

    // Get appointment first
    const [rows] = await db.execute(
      `SELECT appointment_date, appointment_time 
       FROM appointments 
       WHERE appointment_id=? AND patient_id=?`,
      [req.params.id, patient_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const { appointment_date, appointment_time } = rows[0];

    // Create appointment datetime
    const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`);
    const now = new Date();

    // 1 HOUR RULE
    const diffMs = appointmentDateTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      return res.status(400).json({
        message: "Cannot cancel within 1 hour of appointment time"
      });
    }

    await db.execute(
      `UPDATE appointments 
       SET status='cancelled', cancelled_by='patient'
       WHERE appointment_id=? AND patient_id=?`,
      [req.params.id, patient_id]
    );

    res.json({ message: "Appointment cancelled successfully" });

  } catch (err) {
    console.error("CANCEL ERROR:", err);
    res.status(500).json({ message: "Cancel failed" });
  }
};

/* GET BOOKED SLOTS */
exports.getBookedSlots = async (req, res) => {
  try {
    const { department, date } = req.query;

    if (!department || !date) {
      return res.status(400).json({ message: "Missing params" });
    }

    const [rows] = await db.execute(
      `
      SELECT appointment_time
      FROM appointments
      WHERE department = ?
      AND appointment_date = ?
      AND status != 'cancelled'
      `,
      [department, date]
    );

    res.json(rows);

  } catch (err) {
    console.error("BOOKED SLOTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};