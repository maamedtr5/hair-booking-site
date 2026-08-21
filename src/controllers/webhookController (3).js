// src/controllers/webhookController.js
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { safeErrorMessage } from '../utils/errorMessages.js';


const RELEVANT_EVENTS = new Set(['charge.success', 'charge.failed']);

export const paystackWebhook = async (req, res) => {
  try {
    if (!req.rawBody) {
      console.error('Missing rawBody on webhook request — check Server.js json() verify config');
      return res.status(500).json({ success: false, message: 'Server misconfiguration' });
    }

    const expectedHash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET)
      .update(req.rawBody)
      .digest('hex');

    const signature = req.headers['x-paystack-signature'] || '';
    const expectedBuf = Buffer.from(expectedHash, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    const isValid =
      expectedBuf.length === signatureBuf.length &&
      crypto.timingSafeEqual(expectedBuf, signatureBuf);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body;

    if (!RELEVANT_EVENTS.has(event.event)) {
      return res.sendStatus(200);
    }

    const reference = event.data?.reference;
    if (!reference) {
      console.warn(`Paystack webhook ${event.event} had no data.reference — ignoring`);
      return res.sendStatus(200);
    }

    const existing = await prisma.payment.findUnique({ where: { transactionRef: reference } });
    if (!existing) {
    
      console.warn(`Paystack webhook for unknown reference "${reference}" — ignoring`);
      return res.sendStatus(200);
    }

  
    if (existing.status === 'SUCCESS' || existing.status === 'FAILED') {
      return res.sendStatus(200);
    }

    await prisma.payment.update({
      where: { transactionRef: reference },
      data: {
        status: event.event === 'charge.success' ? 'SUCCESS' : 'FAILED',
        externalId: String(event.data.id),
        metadata: event.data,
      },
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error('Paystack webhook error:', err);
    return res.status(400).json({ success: false, message: safeErrorMessage(err, 'Webhook processing failed.') });
  }
};