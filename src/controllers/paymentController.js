import { handlePayment } from '../services/payment/providerService.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaymentPolicyConfig, computeDepositAmount } from '../utils/paymentPolicy.js';


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

  let fullPrice = booking.appointment.service.price;

  if (booking.promocode && booking.promocode.isActive) {
    const now = new Date();
    if (now >= booking.promocode.validFrom && now <= booking.promocode.validUntil) {
      fullPrice =
        booking.promocode.type === 'PERCENTAGE'
          ? fullPrice - (fullPrice * booking.promocode.discount) / 100
          : Math.max(0, fullPrice - booking.promocode.discount);
    }
  }

  const policy = await getPaymentPolicyConfig();
  const amountDue = policy.requireDeposit ? computeDepositAmount(fullPrice, policy) : fullPrice;

  return { booking, fullPrice, amountDue, isDeposit: policy.requireDeposit };
}


export const getPaymentQuote = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (!bookingId) return sendError(res, 'A valid bookingId is required', 400);

    const { fullPrice, amountDue, isDeposit } = await resolveBookingAmount(bookingId);
    return sendSuccess(res, { fullPrice, amountDue, isDeposit });
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};



export const initializePayment = async (req, res) => {
  const { bookingId, method, provider, metadata } = req.body;

  try {
    if (!provider) {
      return sendError(res, 'Payment provider must be explicitly set', 400);
    }
    if (!bookingId) {
      return sendError(res, 'bookingId is required', 400);
    }

    const { booking, amountDue, isDeposit } = await resolveBookingAmount(bookingId);

    if (booking.status === 'CANCELLED') {
      return sendError(res, 'This booking has been cancelled and can no longer be paid for.', 400);
    }

    if (amountDue <= 0) {
      return sendError(res, 'No payment is required for this booking.', 400);
    }

    const existing = await prisma.payment.findUnique({ where: { bookingId } });

    if (existing && existing.status === 'SUCCESS') {
      return sendError(res, 'This booking has already been paid for.', 409);
    }

    const response = await handlePayment(provider, amountDue, metadata);

    const paymentData = {
      amount: amountDue,
      method,
      provider,
      status: 'PENDING',
      transactionRef: response.reference,
      externalId: response.externalId,
      metadata: { ...metadata, isDeposit },
      errorMessage: null,
    };

    const payment = existing
      ? await prisma.payment.update({ where: { bookingId }, data: paymentData })
      : await prisma.payment.create({ data: { bookingId, ...paymentData } });

 
    return sendSuccess(res, { payment, checkoutUrl: response.checkoutUrl, isDeposit }, existing ? 200 : 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};


export const recordManualPayment = async (req, res) => {
  try {
    const { bookingId, amount, method } = req.body;

    if (!bookingId) return sendError(res, 'bookingId is required', 400);
    if (!amount || amount <= 0) return sendError(res, 'A positive amount is required', 400);
    if (!['CASH', 'MOBILE_MONEY'].includes(method)) {
      return sendError(res, 'method must be CASH or MOBILE_MONEY', 400);
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return sendError(res, 'Booking not found', 404);

    const existing = await prisma.payment.findUnique({ where: { bookingId } });

   
    if (existing && existing.status === 'SUCCESS') {
      return sendError(res, 'This booking has already been marked as paid.', 409);
    }

    const payment = existing
      ? await prisma.payment.update({
          where: { bookingId },
          data: {
            amount: existing.amount + amount,
            method,
            provider: method,
            status: 'SUCCESS',
          },
        })
      : await prisma.payment.create({
          data: {
            bookingId,
            amount,
            method,
            provider: method, // PaymentProvider also has CASH/MOBILE_MONEY values
            status: 'SUCCESS',
          },
        });

    return sendSuccess(res, payment, existing ? 200 : 201, 'Payment recorded');
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