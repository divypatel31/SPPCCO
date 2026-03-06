const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text }) => {
  // Setup your email transporter
  // IMPORTANT: For Gmail, you must use an "App Password", not your normal password.
  // Go to Google Account -> Security -> 2-Step Verification -> App Passwords
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // e.g., 'your.email@gmail.com'
      pass: process.env.EMAIL_PASS, // e.g., 'abcd efgh ijkl mnop' (16-char App Password)
    },
  });

  const mailOptions = {
    from: `"MediCare HMS" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;