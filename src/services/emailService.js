// services/emailService.js
import nodemailer from 'nodemailer';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Email templates
const emailTemplates = {
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

    const mailOptions = {
      from: `"${process.env.BUSINESS_NAME || 'Hair Booking'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: subject || emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('  Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    console.warn('Please check your EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env');
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
