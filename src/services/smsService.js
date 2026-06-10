// services/smsService.js
import twilio from 'twilio';
import { env } from '../config/env.js';

let client = null;

// Initialize Twilio client only if not in mock mode
const initializeTwilio = () => {
  if (!client && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    console.log('  Twilio client initialized');
  }
};

// Format appointment reminder SMS
export const formatReminderSMS = (data) => {
  return `Hi ${data.clientName}! Reminder: Your ${data.serviceName} appointment with ${data.staffName} is tomorrow at ${data.appointmentTime}. Location: ${process.env.BUSINESS_ADDRESS || 'Our salon'}. See you soon! 💇 - Hair Booking`;
};

// Core SMS sender
export const sendSMS = async ({ to, message }) => {
  try {
    if (process.env.USE_SMS_MOCK === 'true') {
      console.log(`📩 MOCK SMS to ${to}: ${message}`);
      return { status: 'mocked', to };
    }

    initializeTwilio();

    if (!client) {
      console.warn('⚠️ SMS service not configured. Skipping SMS.');
      return { success: false, error: 'SMS service not configured' };
    }

    if (!to) throw new Error('Recipient phone number is required');

    // Format Ghana numbers (convert 0XXX → +233XXX)
    let formattedPhone = to.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+233' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+233' + formattedPhone;
    }

    const result = await client.messages.create({
      body: message,
      from: env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log(`📱 SMS sent successfully to ${formattedPhone}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    throw error;
  }
};

// Appointment reminder wrapper
export const sendAppointmentReminderSMS = async (data) => {
  const message = formatReminderSMS(data);
  return sendSMS({ to: data.clientPhone, message });
};

// Verify configuration
export const verifySMSConfig = () => {
  const isConfigured = !!(
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    env.TWILIO_PHONE_NUMBER
  );

  if (isConfigured) {
    console.log('  SMS service (Twilio) is configured');
    initializeTwilio();
  } else {
    console.warn('⚠️ SMS service not configured (Twilio credentials missing)');
    console.warn('   Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env');
  }

  return isConfigured;
};

// Send test SMS
export const sendTestSMS = async (to) => {
  try {
    await sendSMS({
      to,
      message: 'Test SMS from Hair Booking! Your appointment reminder system is working correctly. 💇',
    });
    console.log('  Test SMS sent successfully');
  } catch (error) {
    console.error('❌ Failed to send test SMS:', error);
  }
};
