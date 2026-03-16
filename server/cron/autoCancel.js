const cron = require('node-cron');
const db = require('../config/db');

const sweepAppointments = async () => {
  console.log('⏳ Running Auto-Cancel Sweeper...');

  try {
    // 🔥 BULLETPROOF QUERY:
    // This checks if the appointment's date is strictly BEFORE today's date.
    // So any pending/scheduled appointment from yesterday or older is instantly cancelled.
    const query = `
      UPDATE appointments
      SET status = 'cancelled', cancelled_by = 'system'
      WHERE status IN ('pending', 'scheduled')
      AND appointment_date < CURDATE()
    `;

    const [result] = await db.execute(query);

    if (result.affectedRows > 0) {
      console.log(`✅ System auto-cancelled ${result.affectedRows} expired appointments.`);
    } else {
      console.log(`✅ Clean sweep: No expired appointments to cancel.`);
    }

  } catch (error) {
    console.error('❌ Error in Auto-Cancel Sweeper:', error);
  }
};

const startAutoCancelJob = () => {
  // Run immediately on boot
  sweepAppointments();

  // Then run every hour
  cron.schedule('0 * * * *', sweepAppointments);
};

module.exports = startAutoCancelJob;