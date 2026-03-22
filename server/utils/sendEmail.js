// server/utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // 1. Configure the Gmail SMTP server for Port 587 (Bypasses network blocks)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,      // 🔥 CHANGED FROM 465 to 587
      secure: false,  // 🔥 MUST BE FALSE FOR PORT 587 (uses STARTTLS)
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
      },
      tls: {
        rejectUnauthorized: false 
      }
    });

    // 2. Define the email options
    const mailOptions = {
      from: `"MediCare HMS" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);

  } catch (error) {
    console.error("🚨 NODEMAILER ERROR:", error);
    throw new Error("Email could not be sent. Please check credentials.");
  }
};

module.exports = sendEmail;