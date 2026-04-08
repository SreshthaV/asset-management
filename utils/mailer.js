const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"Digital Asset Locker" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your OTP - Digital Asset Locker',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#333;">Verify Your Email</h2>
        <p>Your one-time password for first-time login is:</p>
        <div style="background:#f0f4ff;padding:20px;text-align:center;border-radius:6px;margin:20px 0;">
          <span style="font-size:38px;font-weight:bold;letter-spacing:10px;color:#4A6FFF;">${otp}</span>
        </div>
        <p>This OTP expires in <strong>${process.env.OTP_EXPIRY_MINUTES || 10} minutes</strong>.</p>
        <p style="color:#999;font-size:12px;">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { generateOTP, sendOTPEmail };