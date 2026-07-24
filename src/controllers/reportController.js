import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

// Revenue report — daily breakdown over an optional date range.
// Shape matches RevenueReportData on the frontend exactly:
// { totalRevenue, currency, breakdown: [{ date, amount, bookings }] }
export const getRevenueReportHandler = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { status: 'SUCCESS' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00`);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999`);
    }

    const payments = await prisma.payment.findMany({ where });

    const byDate = {};
    for (const p of payments) {
      const day = p.createdAt.toISOString().slice(0, 10);
      if (!byDate[day]) byDate[day] = { date: day, amount: 0, bookings: 0 };
      byDate[day].amount += p.amount;
      byDate[day].bookings += 1;
    }

    const breakdown = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return sendSuccess(res, { totalRevenue, currency: 'GHS', breakdown });
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Top services report — ranked by completed/booked appointment count, with
// associated successful-payment revenue. Shape matches TopServicesData:
// { services: [{ serviceId, name, bookings, revenue }] }
export const getTopServicesReportHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const services = await prisma.service.findMany({
      include: {
        appointments: {
          where: { status: { not: 'CANCELLED' } },
          include: { booking: { include: { payment: true } } },
        },
      },
    });

    const ranked = services
      .map((s) => {
        const bookings = s.appointments.length;
        const revenue = s.appointments.reduce((sum, a) => {
          const payment = a.booking?.payment;
          return payment?.status === 'SUCCESS' ? sum + payment.amount : sum;
        }, 0);
        return { serviceId: s.id, name: s.name, bookings, revenue };
      })
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, limit);

    return sendSuccess(res, { services: ranked });
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};
