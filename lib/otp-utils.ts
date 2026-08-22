import crypto from 'crypto';
import nodemailer from 'nodemailer';

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

// Generate random OTP code
export function generateOTPCode(): string {
  const code = crypto.randomInt(0, Math.pow(10, OTP_LENGTH))
    .toString()
    .padStart(OTP_LENGTH, '0');
  return code;
}

// Create nodemailer transporter for Gmail
export function createGmailTransporter() {
  if (!process.env.GMAIL_APP_PASSWORD || !process.env.GMAIL_USER) {
    throw new Error('Gmail credentials not configured. Set GMAIL_APP_PASSWORD and GMAIL_USER in environment variables.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// Send OTP via email
export async function sendOTPEmail(email: string, otp: string, schoolName: string = 'Libertad National High School') {
  try {
    const transporter = createGmailTransporter();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: `Your ${schoolName} Login OTP Code`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #333; margin-bottom: 20px; }
            .otp-box { background-color: #f0f4ff; border: 2px solid #4f46e5; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; font-family: 'Courier New', monospace; }
            .warning { color: #666; font-size: 14px; margin-top: 10px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${schoolName}</h2>
              <p>One-Time Password (OTP)</p>
            </div>
            <p>Hello,</p>
            <p>Your one-time password (OTP) for login is:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="warning">This OTP will expire in ${OTP_EXPIRY_MINUTES} minutes.</div>
            </div>
            <p><strong>Important:</strong></p>
            <ul>
              <li>Do not share this OTP with anyone</li>
              <li>This OTP is valid for only ${OTP_EXPIRY_MINUTES} minutes</li>
              <li>If you did not request this, please ignore this email</li>
            </ul>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
}

// Calculate OTP expiry time
export function getOTPExpiryTime(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

// Export constants for use in other files
export const OTP_CONFIG = {
  LENGTH: OTP_LENGTH,
  EXPIRY_MINUTES: OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS: MAX_ATTEMPTS,
};
