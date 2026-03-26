// server/utils/sendEmail.js

const sendEmail = async (options) => {
  try {
    // 🚀 Using Brevo HTTP API (Bypasses Render's SMTP Port Blocks)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY // We will add this to Render next
      },
      body: JSON.stringify({
        sender: { 
          name: "MediCare HMS Support", 
          email: process.env.EMAIL_USER // Keep using your Gmail address here
        },
        to: [
          { email: options.to }
        ],
        subject: options.subject,
        textContent: options.text,
        htmlContent: options.html
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("🚨 Brevo API Rejected the Request:", errorData);
      throw new Error("API Email Failed");
    }

    console.log("✅ Email successfully sent via HTTP API!");

  } catch (error) {
    console.error("🚨 HTTP EMAIL ERROR:", error);
    throw new Error("Email could not be sent. Please check API credentials.");
  }
};

module.exports = sendEmail;