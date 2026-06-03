import express from 'express';
import crypto from 'crypto';

const router = express.Router();

router.post('/', (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // ✅ Compute HMAC using raw Buffer
    const hash = crypto
      .createHmac('sha512', secret)
      .update(req.body) // raw Buffer
      .digest('hex');

    const signature = req.headers['x-paystack-signature'];

    if (hash !== signature) {
      console.error('❌ Invalid Paystack signature');
      return res.status(400).send('Invalid signature');
    }

    // ✅ Parse JSON manually after signature check
    const event = JSON.parse(req.body.toString());

    console.log('✅ Paystack webhook event:', event.event);

    switch (event.event) {
      case 'charge.success':
        // update DB, mark payment successful
        break;
      default:
        console.log('Unhandled event:', event.event);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error handling Paystack webhook:', error);
    res.sendStatus(500);
  }
});

export default router;
