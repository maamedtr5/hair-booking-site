// controllers/appointmentController.js
import { prisma } from '../lib/prisma.js';
import appointmentModel from '../models/appointment.js';
import { sendEmail } from '../services/emailService.js';
import { sendAppointmentReminderSMS } from '../services/smsService.js';

//   Create appointment
export const createAppointment = async (req, res) => {
  try {
    const appointment = await appointmentModel.createAppointment(req.body);

    // Confirmation email
    if (appointment.client?.email) {
      await sendEmail({
        to: appointment.client.email,
        template: 'appointmentConfirmation',
        data: {
          clientName: appointment.client.name || `${appointment.client.firstName} ${appointment.client.lastName}`,
          serviceName: appointment.service?.name,
          appointmentTime: appointment.date || appointment.appointmentDateTime,
          staffName: appointment.staff?.name,
        },
      });
    }

    // Confirmation SMS
    if (appointment.client?.phone) {
      await sendAppointmentReminderSMS({
        clientPhone: appointment.client.phone,
        clientName: appointment.client.name,
        serviceName: appointment.service?.name,
        appointmentTime: appointment.date || appointment.appointmentDateTime,
        staffName: appointment.staff?.name,
      });
    }

    res.json(appointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get single appointment by ID
export const getAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get all appointments
export const getAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });
    res.json(appointments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Update appointment
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: req.body,
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Delete appointment
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.appointment.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get appointments by client ID
export const getAppointmentsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const appointments = await prisma.appointment.findMany({
      where: { booking: { clientId: parseInt(clientId) } },
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });
    res.json(appointments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get appointments by staff ID
export const getAppointmentsByStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const appointments = await prisma.appointment.findMany({
      where: { staffId: parseInt(staffId) },
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });
    res.json(appointments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get appointments by date
export const getAppointmentsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const appointments = await prisma.appointment.findMany({
      where: { date: new Date(date) },
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });
    res.json(appointments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get appointments by status
export const getAppointmentsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const appointments = await prisma.appointment.findMany({
      where: { status: status.toUpperCase() },
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });
    res.json(appointments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Bulk cancel appointments (with notifications)
export const bulkCancelAppointments = async (req, res) => {
  try {
    const { ids } = req.body;
    const cancelledAppointments = await prisma.appointment.findMany({
      where: { id: { in: ids } },
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });

    await prisma.appointment.updateMany({
      where: { id: { in: ids } },
      data: { status: 'CANCELLED' },
    });

    for (const appt of cancelledAppointments) {
      if (appt.booking?.client?.email) {
        await sendEmail({
          to: appt.booking.client.email,
          template: 'appointmentCancelled',
          data: {
            clientName: appt.booking.client.name,
            serviceName: appt.service?.name,
            appointmentTime: appt.date,
            staffName: appt.staff?.name,
          },
        });
      }
      if (appt.booking?.client?.phone) {
        await sendAppointmentReminderSMS({
          clientPhone: appt.booking.client.phone,
          clientName: appt.booking.client.name,
          serviceName: appt.service?.name,
          appointmentTime: appt.date,
          staffName: appt.staff?.name,
        });
      }
    }

    res.json({ message: 'Appointments cancelled and clients notified', count: ids.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Reschedule appointment (with notifications)
export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate } = req.body;

    const updated = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: { date: new Date(newDate), status: 'RESCHEDULED' }, //   now valid enum
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });

    if (updated.booking?.client?.email) {
      await sendEmail({
        to: updated.booking.client.email,
        template: 'appointmentRescheduled',
        data: {
          clientName: updated.booking.client.name,
          serviceName: updated.service?.name,
          appointmentTime: updated.date,
          staffName: updated.staff?.name,
        },
      });
    }
    if (updated.booking?.client?.phone) {
      await sendAppointmentReminderSMS({
        clientPhone: updated.booking.client.phone,
        clientName: updated.booking.client.name,
        serviceName: updated.service?.name,
        appointmentTime: updated.date,
        staffName: updated.staff?.name,
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Internal system update (calendar sync + reminders)
export const internalUpdateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data,
      include: { service: true, staff: true, booking: { include: { client: true } } },
    });

    // If date changed, resync Google Calendar
    if (data.date && updated.googleEventId) {
      await googleCalendarClient.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: updated.googleEventId,
        resource: {
          summary: `Hair Appointment`,
          description: updated.notes,
          start: { dateTime: updated.date },
          end: { dateTime: addDuration(updated.date, updated.serviceId) }
        }
      });
    }

    // If date changed, reschedule reminder job
    if (data.date) {
      await reminderJobs.rescheduleReminder(updated.id, updated.date);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Schedule appointment reminder
export const scheduleAppointmentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({ where: { id: parseInt(id) } });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    await reminderJobs.scheduleReminder(appointment.id, appointment.date);

    res.json({ message: 'Reminder scheduled successfully', appointmentId: appointment.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Cancel appointment reminder
export const cancelAppointmentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    await reminderJobs.cancelReminder(parseInt(id));

    await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: { reminderScheduled: false }
    });

    res.json({ message: 'Reminder cancelled successfully', appointmentId: id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get reminder queue stats
export const getQueueStats = async (req, res) => {
  try {
    const stats = await reminderJobs.getQueueStats();
    res.json(stats);
  } catch (err) {
    res.status(400).json({ error: err.message });
   
  }
};
