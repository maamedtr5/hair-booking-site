import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

// Revenue report
export const getRevenueReportHandler = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({ where: { status: 'SUCCESS' } });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    return sendSuccess(res, { totalRevenue, count: payments.length });
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Top services report
export const getTopServicesReportHandler = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      select: {
        name: true,
        _count: {
          select: { appointments: true }
        }
      }
    });

    const ranked = services
      .map(s => ({ name: s.name, count: s._count.appointments }))
      .sort((a, b) => b.count - a.count);

    return sendSuccess(res, ranked);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};