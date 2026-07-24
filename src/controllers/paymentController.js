import { handlePayment } from '../services/payment/providerService.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

// Computes the authoritative charge amount server-side from the booking's
// service price (+ active promocode discount), rather than trusting whatever
// `amount` the client sends. A client-supplied amount must never be charged
// as-is — that would let anyone pay any price they choose.
async function resolveBookingAmount(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      appointment: { include: { service: true } },
      promocode: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  let amount = booking.appointment.service.price;

  if (booking.promocode && booking.promocode.isActive) {
    const now = new Date();
    if (now >= booking.promocode.validFrom && now <= booking.promocode.validUntil) {
      amount =
        booking.promocode.type === 'PERCENTAGE'
          ? amount - (amount * booking.promocode.discount) / 100
          : Math.max(0, amount - booking.promocode.discount);
    }
  }

  return { booking, amount };
}

//   Initialize payment (creates a new record)
export const initializePayment = async (req, res) => {
  const { bookingId, method, provider, metadata } = req.body;

  try {
    if (!provider) {
      return sendError(res, 'Payment provider must be explicitly set', 400);
    }
    if (!bookingId) {
      return sendError(res, 'bookingId is required', 400);
    }

    const { amount } = await resolveBookingAmount(bookingId);

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
        metadata,
      },
    });

    //    201 Created for new resource
    return sendSuccess(res, { payment, checkoutUrl: response.checkoutUrl }, 201);
  } catch (err) {
    return sendError(res, err.message, 400);
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
    return sendSuccess(res, payment);
  } catch (err) {
    return sendError(res, err.message, 400);
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
    return sendSuccess(res, payment);
  } catch (err) {
    return sendError(res, err.message, 400);
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
    return sendSuccess(res, payments);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};
