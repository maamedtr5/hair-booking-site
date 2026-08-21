 import { handlePayment } from '../services/payment/providerService.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaymentPolicyConfig, computeDepositAmount } from '../utils/paymentPolicy.js';

import { safeErrorMessage } from '../utils/errorMessages.js';
// Computes the authoritative charge amount server-side from the booking's
// service price (+ active promocode discount), rather than trusting whatever
// `amount` the client sends. A client-supplied amount must never be charged
// as-is — that would let anyone pay any price they choose.
//
// When the admin's payment policy requires a deposit, the amount charged
// at booking time is the deposit only — not the full price. The rest is
// collected in person (cash/MoMo, directly between client and staff/admin)
// and logged afterwards via recordManualPayment.
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

  // A WAITLISTED appointment doesn't have a slot yet — nothing is owed
  // until promoteWaitlistedAppointments() promotes it to PENDING. Charging
  // (or even quoting) a deposit before that point would take money for a
  // booking that may never happen. The frontend already skips this call
  // entirely for waitlisted bookings; this is the server-side backstop.
  if (booking.appointment.status === 'WAITLISTED') {
    const err = new Error(
      'This booking is on the waitlist and does not require payment yet. ' +
      'You will be notified when a slot opens up and payment is due.'
    );
    err.status = 409;
    err.code = 'BOOKING_WAITLISTED';
    throw err;
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

// Lets the frontend show the client what they'll actually be charged
// (full price, deposit-only, or nothing under pay-after) before they
// commit to paying — without duplicating the pricing logic client-side.
export const getPaymentQuote = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (!bookingId) return sendError(res, 'A valid bookingId is required', 400);

    const { fullPrice, amountDue, isDeposit } = await resolveBookingAmount(bookingId);
    return sendSuccess(res, { fullPrice, amountDue, isDeposit });
  } catch (err) {
    return sendError(res, safeErrorMessage(err), err.status || 400, err.code ? { code: err.code } : {});
  }
};

//   Initialize payment (creates a new record, or re-initializes a
//   PENDING/FAILED one so declined/abandoned checkouts can be retried).
//
// `Payment.bookingId` is unique — a booking can only ever have one payment
// row. Previously this always called `prisma.payment.create(...)`, which
// meant a second payment attempt on a booking whose first attempt failed
// or was abandoned would throw a unique-constraint error and the client
// could never pay for that booking again. Now: if a payment row already
// exists and isn't SUCCESS, we re-initialize it in place instead of trying
// to insert a duplicate.
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
      const err = new Error('No payment is required for this booking.');
      err.status = 400;
      err.code = 'NO_PAYMENT_REQUIRED';
      throw err;
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

    //    201 for a newly-created payment row, 200 when re-initializing an
    //    existing PENDING/FAILED one for retry.
    return sendSuccess(res, { payment, checkoutUrl: response.checkoutUrl, isDeposit }, existing ? 200 : 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), err.status || 400, err.code ? { code: err.code } : {});
  }
};

// Staff/admin records a payment collected in person (cash or MoMo,
// directly between client and staff/admin) — not routed through Paystack.
// This is how the remaining balance (or the full amount, under the
// default pay-after policy) gets tracked for reporting.
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

    // Don't silently stack an amount onto a payment that's already fully
    // settled — a second manual entry on an already-SUCCESS payment is
    // almost always a duplicate submission, not a genuine balance top-up.
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
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Mark payment as SUCCESS
// Refund states are the end of the line for a payment record — flipping
// one back to SUCCESS/FAILED here would silently erase the refund trail.
// A genuine correction should go through markPaymentRefunded (which
// intentionally allows any starting state) rather than through these.
const REFUND_LOCKED_STATUSES = ['REFUNDED', 'REFUND_PENDING'];

export const markPaymentSuccess = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Payment not found', 404);
    if (REFUND_LOCKED_STATUSES.includes(existing.status)) {
      return sendError(res, `Cannot mark a ${existing.status} payment as SUCCESS`, 409);
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'SUCCESS' }
    });

    //    200 OK (resource updated)
    return sendSuccess(res, payment);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Mark payment as FAILED
export const markPaymentFailed = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Payment not found', 404);
    if (REFUND_LOCKED_STATUSES.includes(existing.status)) {
      return sendError(res, `Cannot mark a ${existing.status} payment as FAILED`, 409);
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'FAILED' }
    });

    //    200 OK (resource updated)
    return sendSuccess(res, payment);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

// Mark a REFUND_PENDING payment as actually refunded, once staff/admin
// have processed the refund on the Paystack/MoMo side (this app never
// initiates a refund transaction itself — that's a deliberate manual
// step with real money attached). Only meaningful coming from
// REFUND_PENDING, but doesn't hard-block other starting states in case
// of a manual correction.
export const markPaymentRefunded = async (req, res) => {
  try {
    const payment = await prisma.payment.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'REFUNDED' },
    });
    return sendSuccess(res, payment, 200, 'Payment marked as refunded');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Get all payments (paginated). Supports ?status=REFUND_PENDING (etc.)
//   so the admin UI can surface "these need action" without a full scan.
export const getPayments = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 1000;
    const { status } = req.query;

    const payments = await prisma.payment.findMany({
      skip,
      take,
      ...(status ? { where: { status: String(status).toUpperCase() } } : {}),
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
    return sendError(res, safeErrorMessage(err), 400);
  }
};