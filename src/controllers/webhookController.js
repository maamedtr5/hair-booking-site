// src/controllers/webhookController.js
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

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
    await prisma.payment.update({
      where: { transactionRef: event.data.reference },
      data: {
        status: event.event === 'charge.success' ? 'SUCCESS' : 'FAILED',
        externalId: String(event.data.id),
        metadata: event.data,
      },
    });

    return res.sendStatus(200);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};