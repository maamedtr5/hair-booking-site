// src/config/env.js
import dotenv from "dotenv";
dotenv.config();

// Validate required variables for core backend
const required = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'PAYSTACK_SECRET'];
required.forEach((key) => {
  if (!process.env[key]) {
    console.warn(` Missing environment variable: ${key}`);
  }
});

export const env = {
  port: process.env.PORT || 5001,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  paystackSecret: process.env.PAYSTACK_SECRET,

  // Email (Resend) + business info
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  BUSINESS_NAME: process.env.BUSINESS_NAME,
  BUSINESS_ADDRESS: process.env.BUSINESS_ADDRESS,
  BUSINESS_PHONE: process.env.BUSINESS_PHONE,
  BUSINESS_EMAIL: process.env.BUSINESS_EMAIL,
  FRONTEND_URL: process.env.FRONTEND_URL,

  // Twilio (for SMS)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  // Google OAuth (for social login)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_CALLBACK_URL,
};
