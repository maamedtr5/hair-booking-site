import { prisma } from '../lib/prisma.js';

// Revenue report 
export const getRevenueReportHandler = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({ where: { status: 'SUCCESS' } });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    res.status(200).json({ totalRevenue, count: payments.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

    res.status(200).json(ranked);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
