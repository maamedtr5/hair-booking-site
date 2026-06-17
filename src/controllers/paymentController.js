import { handlePayment } from '../services/payment/providerService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

//   Initialize payment (creates a new record)
export const initializePayment = async (req, res) => {
  const { bookingId, amount, method, provider, metadata } = req.body;

  try {
    if (!provider) {
      return res.status(400).json({ error: "Payment provider must be explicitly set" });
    }

    const response = await handlePayment(provider, amount, metadata);

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        method,
        provider,
        status: 'PENDING',
        transactionRef: response.reference,
        externalId: response.externalId,
        metadata
      }
    });

    //    201 Created for new resource
    res.status(201).json({ payment, checkoutUrl: response.checkoutUrl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Mark payment as SUCCESS
export const markPaymentSuccess = async (req, res) => {
  try {
    const payment = await prisma.payment.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'SUCCESS' }
    });

    //    200 OK (resource updated)
    res.status(200).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Mark payment as FAILED
export const markPaymentFailed = async (req, res) => {
  try {
    const payment = await prisma.payment.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'FAILED' }
    });

    //    200 OK (resource updated)
    res.status(200).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get all payments (paginated)
export const getPayments = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const payments = await prisma.payment.findMany({
      skip,
      take,
      include: {
        booking: {
          include: {
            client: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    //    200 OK for successful retrieval
    res.status(200).json(payments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
