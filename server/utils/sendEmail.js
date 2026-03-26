// server/utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,      
      secure: false,  
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
      },
      tls: {
        rejectUnauthorized: false 
      },
      family: 4 
    });

    const mailOptions = {
      from: `"MediCare HMS" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    await transporter.sendMail(mailOptions);

  } catch (error) {
    console.error("🚨 NODEMAILER ERROR:", error);
    throw new Error("Email could not be sent. Please check credentials.");
  }
};

module.exports = sendEmail;