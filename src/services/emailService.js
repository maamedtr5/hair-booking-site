// services/emailService.js
import { Resend } from 'resend';
import { getBusinessInfoConfig } from '../utils/businessInfo.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
const emailTemplates = {
  adminOtpCode: (data) => ({
    subject: `Your sign-in code: ${data.code}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 480px; margin: 0 auto; background: white; }
            .header { background: #241a11; color: #f0e6d8; padding: 24px; text-align: center; }
            .content { padding: 30px; text-align: center; }
            .code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #241a11;
                     background: #f0e6d8; padding: 16px 24px; border-radius: 8px; display: inline-block; margin: 16px 0; }
            .fine-print { color: #6b5240; font-size: 13px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1 style="margin:0;font-size:20px;">Sign-in verification</h1></div>
            <div class="content">
              <p>Hi ${data.name},</p>
              <p>Use this code to finish signing in to the admin dashboard:</p>
              <div class="code">${data.code}</div>
              <p>This code expires in 5 minutes.</p>
              <p class="fine-print">
                If you didn't try to sign in, you can ignore this email — your
                account is still safe. Consider changing your password if this
                keeps happening.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.name}, your sign-in code is ${data.code}. It expires in 5 minutes. If you didn't try to sign in, ignore this email.`,
  }),

  appointmentReminder: (data) => ({
    subject: `⏰ Reminder: Your ${data.serviceName} Appointment Tomorrow`,
    html: `... existing HTML reminder template ...`,
    text: `... existing plain text reminder ...`,
  }),

  appointmentConfirmation: (data) => ({
    subject: `  Appointment Confirmed - ${data.serviceName}`,
    html: `... existing HTML confirmation template ...`,
    text: `Hi ${data.clientName}, your ${data.serviceName} appointment is confirmed for ${data.appointmentTime} with ${data.staffName}.`,
  }),

  appointmentCancelled: (data) => ({
    subject: `❌ Appointment Cancelled - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .cancel-icon { font-size: 48px; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="cancel-icon">❌</div>
              <h1>Appointment Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>Your ${data.serviceName} appointment with ${data.staffName} scheduled for ${data.appointmentTime} has been cancelled.</p>
              <p>If you’d like to reschedule, please contact us or book a new appointment online.</p>
              <p>Thank you for your understanding,<br>Hair Booking Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.clientName},

Your ${data.serviceName} appointment with ${data.staffName} scheduled for ${data.appointmentTime} has been cancelled.

If you’d like to reschedule, please contact us or book a new appointment online.

Thank you for your understanding,
Hair Booking Team
    `,
  }),

  appointmentWaitlisted: (data) => ({
    subject: `You're on the waitlist - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #b08d57; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're on the Waitlist</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>Every stylist is already booked for your requested ${data.serviceName} time (${data.appointmentTime}), so we've added you to the waitlist for that slot.</p>
              <p>We'll email and text you the moment a stylist becomes free for that time — no action needed from you right now.</p>
              <p>Thank you for your patience,<br>Locs Allure</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.clientName},

Every stylist is already booked for your requested ${data.serviceName} time (${data.appointmentTime}), so we've added you to the waitlist for that slot.

We'll email and text you the moment a stylist becomes free for that time — no action needed from you right now.

Thank you for your patience,
Locs Allure
    `,
  }),

  appointmentWaitlistPromoted: (data) => ({
    subject: `A slot opened up - ${data.serviceName} confirmed`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #2e7d32; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Good News — You're Off the Waitlist!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>A slot just opened up and your ${data.serviceName} appointment for ${data.appointmentTime} is now booked.</p>
              <p>We look forward to seeing you then!</p>
              <p>Best regards,<br>Locs Allure</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.clientName},

A slot just opened up and your ${data.serviceName} appointment for ${data.appointmentTime} is now booked.

We look forward to seeing you then!

Best regards,
Locs Allure
    `,
  }),

  appointmentRescheduled: (data) => ({
    subject: `🔄 Appointment Rescheduled - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #ffc107; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .reschedule-icon { font-size: 48px; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="reschedule-icon">🔄</div>
              <h1>Appointment Rescheduled</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>Your ${data.serviceName} appointment with ${data.staffName} has been rescheduled.</p>
              <p><strong>New Date & Time:</strong> ${data.appointmentTime}</p>
              <p>We look forward to seeing you then!</p>
              <p>Best regards,<br>Hair Booking Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.clientName},

Your ${data.serviceName} appointment with ${data.staffName} has been rescheduled.
New appointment time: ${data.appointmentTime}.

We look forward to seeing you then!

Best regards,
Hair Booking Team
    `,
  }),
};

/**
 * Send email using configured template
 */
export const sendEmail = async ({ to, subject, template, data }) => {
  try {
    if (!to) throw new Error('Recipient email address is required');

    const emailContent = emailTemplates[template](data);

    // Settings (admin-editable, via Settings > Business Information) is
    // the source of truth now; the env var and hardcoded string are only
    // there so this doesn't break for anyone who hasn't set it yet.
    const businessInfo = await getBusinessInfoConfig();
    const businessName = businessInfo.name || process.env.BUSINESS_NAME || 'Hair Booking';

    const mailOptions = {
      from: `"${businessName}" <${process.env.EMAIL_FROM}>`,
      to,
      subject: subject || emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    };

    // Resend returns { data, error } rather than throwing — turn a
    // failed send into a real rejected promise so this keeps behaving
    // exactly like it did with nodemailer, which every call site's
    // .catch(...) already expects.
    const { data: sendResult, error } = await resend.emails.send(mailOptions);
    if (error) throw new Error(error.message || 'Resend failed to send the email');

    console.log(`📧 Email sent successfully to ${to}: ${sendResult.id}`);
    return { success: true, messageId: sendResult.id };
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};

/**
 * Verify email configuration — a lightweight, no-email-sent call that
 * confirms RESEND_API_KEY is actually valid (401 if not), standing in
 * for nodemailer's SMTP-handshake-based transporter.verify().
 */
export const verifyEmailConfig = async () => {
  try {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    const { error } = await resend.apiKeys.list();
    if (error) throw new Error(error.message || 'Invalid Resend API key');
    console.log('  Email service (Resend) is configured');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    console.warn('Please check RESEND_API_KEY (and EMAIL_FROM) in .env');
    return false;
  }
};

/**
 * Send test email
 */
export const sendTestEmail = async (to) => {
  try {
    await sendEmail({
      to,
      subject: 'Test Email from Hair Booking',
      template: 'appointmentConfirmation',
      data: {
        clientName: 'Test User',
        serviceName: 'Haircut & Styling',
        appointmentTime: 'January 15, 2024 at 2:00 PM',
        staffName: 'Sarah Johnson',
      },
    });
    console.log('  Test email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }
};
