import axios from 'axios';

export const handlePayment = async (provider, amount, metadata) => {
  switch (provider) {
    case 'PAYSTACK': {
      // Paystack requires an email on every transaction init. Previously
      // this read `metadata.email` with no guard, so a caller that forgot
      // to pass `metadata` at all (or passed it empty) crashed with an
      // opaque "Cannot read properties of undefined" instead of a real
      // error. Fail loud and specific instead — this is money-path code.
      const email = metadata?.email;
      if (!email) {
        const err = new Error('An email address is required to process this payment.');
        err.status = 400;
        err.code = 'PAYMENT_EMAIL_REQUIRED';
        throw err;
      }
      return await initializePaystack(amount, email);
    }

    case 'CASH':
    case 'MOBILE_MONEY':
      // Static methods: no API call, just record locally
      return {
        reference: `STATIC-${Date.now()}`,
        externalId: null,
        checkoutUrl: null
      };

    default: {
      const err = new Error('Unsupported provider');
      err.status = 400;
      err.code = 'UNSUPPORTED_PROVIDER';
      throw err;
    }
  }
};

const initializePaystack = async (amount, email) => {
  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    { amount: amount * 100, email },
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` } }
  );

  return {
    reference: response.data.data.reference,
    checkoutUrl: response.data.data.authorization_url,
    externalId: response.data.data.reference
  };
};
