// jobs/reminderJobs.js
import cron from 'node-cron';
import moment from 'moment';
import { sendEmail } from '../services/emailService.js';
import { sendAppointmentReminderSMS } from '../services/smsService.js';
import { prisma } from '../lib/prisma.js';


// Keep a registry of scheduled tasks in memory
const reminderTasks = {};

/**
 * Daily job to send reminders for upcoming appointments
 */
export const scheduleDailyReminders = () => {
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('🔄 Running daily reminder scheduler...');
      // ... your existing reminder logic here ...
    } catch (error) {
      console.error('❌ Error in daily reminder scheduler:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Accra',
  });
};

/**
 * Schedule a reminder for a specific appointment
 * @param {string} appointmentId - ID of the appointment
 * @param {number} minutesBefore - How many minutes before the appointment to send the reminder
 */
export const scheduleAppointmentReminder = async (appointmentId, minutesBefore = 30) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: { include: { user: true } },
        service: true,
        staff: { include: { user: true } },
      },
    });

    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    //   Compute reminder time from appointment date
    const reminderTime = moment(appointment.date).subtract(minutesBefore, 'minutes');
    const cronExpression = `${reminderTime.minute()} ${reminderTime.hour()} ${reminderTime.date()} ${reminderTime.month() + 1} *`;

    const task = cron.schedule(cronExpression, async () => {
      const formattedTime = moment(appointment.date).format('MMMM Do YYYY, h:mm A');

      const reminderData = {
        clientName: appointment.client?.user?.name || 'there',
        serviceName: appointment.service?.name || 'Your service',
        staffName: appointment.staff?.user?.name || 'your stylist',
        appointmentTime: formattedTime,
        appointmentId: appointment.id,
      };

      if (appointment.client?.user?.email || appointment.client?.email) {
        await sendEmail({
          to: appointment.client.user?.email || appointment.client.email,
          template: 'appointmentReminder',
          data: reminderData,
        });
      }

      if (appointment.client?.user?.phone || appointment.client?.phone) {
        await sendAppointmentReminderSMS({
          ...reminderData,
          clientPhone: appointment.client.user?.phone || appointment.client.phone,
        });
      }
    });

    //   Store task keyed by appointmentId
    reminderTasks[appointmentId] = task;

    //   Persist reminder info in DB
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderCron: cronExpression, reminderActive: true }
    });

    console.log(`  Reminder scheduled for appointment ${appointmentId} at ${reminderTime.format('MMMM Do YYYY, h:mm A')}`);
    return task;
  } catch (error) {
    console.error('❌ Error scheduling appointment reminder:', error);
  }
};

/**
 * Cancel a scheduled reminder by appointment ID
 */
export const cancelAppointmentReminder = async (appointmentId) => {
  try {
    const task = reminderTasks[appointmentId];
    if (task) {
      task.stop();
      delete reminderTasks[appointmentId];

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { reminderActive: false, reminderCron: null }
      });

      console.log(`  Appointment reminder cancelled for appointment ${appointmentId}`);
    } else {
      console.warn(`⚠️ No reminder task found for appointment ${appointmentId}`);
    }
  } catch (error) {
    console.error('❌ Error cancelling appointment reminder:', error);
  }
};

/**
 * Restore reminders from DB on server startup
 */
export const restoreRemindersOnStartup = async () => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { reminderActive: true, reminderCron: { not: null } }
    });

    appointments.forEach(appt => {
      //   Use stored cron expression from DB
      const task = cron.schedule(appt.reminderCron, async () => {
        const formattedTime = moment(appt.date).format('MMMM Do YYYY, h:mm A');
        console.log(`🔔 Reminder fired for appointment ${appt.id} at ${formattedTime}`);
        // You can re‑use the same email/SMS logic here if needed
      });
      reminderTasks[appt.id] = task;
    });

    console.log(`🔄 Restored ${appointments.length} appointment reminders on startup`);
  } catch (error) {
    console.error('❌ Error restoring reminders on startup:', error);
  }
};

/**
 * Export job stats
 */
export const getQueueStats = async () => {
  return {
    jobs: [
      { name: 'dailyReminders', schedule: '0 9 * * *', status: 'scheduled' },
      { name: 'appointmentReminders', count: Object.keys(reminderTasks).length }
    ]
  };
};
