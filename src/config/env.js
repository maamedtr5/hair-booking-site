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

  // Email + business info
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
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
