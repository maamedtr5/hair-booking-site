// tests/accessControl.test.js
//
// Controller-level tests (Prisma mocked, no DB) for the two highest-impact
// access-control fixes: what the public staff endpoints may return, and who
// may start a payment on a booking.
import { jest } from '@jest/globals';

const prismaMock = {
  staff: { findUnique: jest.fn(), findMany: jest.fn() },
  booking: { findUnique: jest.fn() },
  payment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
};
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../src/utils/paymentPolicy.js', () => ({
  getPaymentPolicyConfig: async () => ({ requireDeposit: false }),
  computeDepositAmount: (p) => p,
}));
jest.unstable_mockModule('../src/services/payment/providerService.js', () => ({
  handlePayment: jest.fn(async () => ({ reference: 'ref_1', externalId: 'ext_1', checkoutUrl: 'https://pay.example/c' })),
}));

const { getStaffHandler, getStaffsHandler } = await import('../src/controllers/staffController.js');
const { initializePayment } = await import('../src/controllers/paymentController.js');

const makeRes = () => ({
  code: 200, body: null,
  status(c) { this.code = c; return this; },
  json(b) { this.body = b; return this; },
});

beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });

describe('public staff endpoints return an allow-listed shape', () => {
  test('anonymous GET /staff selects only id/userId/bio/createdAt/user{id,name}', async () => {
    prismaMock.staff.findMany.mockResolvedValue([]);
    await getStaffsHandler({ query: {}, user: undefined }, makeRes());
    const arg = prismaMock.staff.findMany.mock.calls[0][0];
    expect(arg.include).toBeUndefined();              // never `user: true`
    expect(arg.select.user).toEqual({ select: { id: true, name: true } });
    expect(Object.keys(arg.select).sort()).toEqual(['bio', 'createdAt', 'id', 'user', 'userId']);
  });

  test('a CLIENT gets the same minimal shape as a guest', async () => {
    prismaMock.staff.findMany.mockResolvedValue([]);
    await getStaffsHandler({ query: {}, user: { id: 5, role: 'CLIENT' } }, makeRes());
    expect(prismaMock.staff.findMany.mock.calls[0][0].include).toBeUndefined();
  });

  test('staff/admin keep the full record (admin pages need email)', async () => {
    prismaMock.staff.findMany.mockResolvedValue([]);
    await getStaffsHandler({ query: {}, user: { id: 1, role: 'ADMIN' } }, makeRes());
    expect(prismaMock.staff.findMany.mock.calls[0][0].include).toEqual({ user: true });
  });

  test('anonymous GET /staff/:id never loads appointments or reviews', async () => {
    prismaMock.staff.findUnique.mockResolvedValue({ id: 3, userId: 9, bio: 'b', createdAt: new Date(), user: { id: 9, name: 'Ama' } });
    const res = makeRes();
    await getStaffHandler({ params: { id: '3' }, user: undefined }, res);
    const arg = prismaMock.staff.findUnique.mock.calls[0][0];
    expect(arg.include).toBeUndefined();
    expect(arg.select.appointments).toBeUndefined();
    expect(arg.select.reviews).toBeUndefined();
    expect(res.code).toBe(200);
  });

  test('a malformed id is rejected before touching the database', async () => {
    const res = makeRes();
    await getStaffHandler({ params: { id: 'abc' }, user: undefined }, res);
    expect(res.code).toBe(400);
    expect(prismaMock.staff.findUnique).not.toHaveBeenCalled();
  });

  test('even if a full user row slipped through, tokens never serialize', async () => {
    prismaMock.staff.findMany.mockResolvedValue([
      { id: 1, user: { id: 9, name: 'Ama', password: 'H', googleAccessToken: 'AT', googleRefreshToken: 'RT' } },
    ]);
    const res = makeRes();
    await getStaffsHandler({ query: {}, user: { id: 1, role: 'ADMIN' } }, res);
    expect(JSON.stringify(res.body)).not.toMatch(/"H"|"AT"|"RT"|googleRefreshToken|googleAccessToken|password/);
  });
});

describe('POST /payments/init — only the booking owner can start a payment', () => {
  const booking = {
    id: 1, status: 'PENDING',
    appointment: { status: 'PENDING', service: { price: 100 } },
    promocode: null,
    client: { user: { id: 70, email: 'Owner@Example.com' } },
  };
  const call = async (req) => {
    prismaMock.booking.findUnique.mockResolvedValue(booking);
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    const res = makeRes();
    await initializePayment({ body: { bookingId: 1, method: 'CARD', provider: 'PAYSTACK', ...req.body }, user: req.user }, res);
    return res;
  };
  const expectUntouched = () => {
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  };

  test('guest with the booking email is allowed (case-insensitive)', async () => {
    const res = await call({ body: { email: ' owner@example.com ' } });
    expect(res.code).toBe(201);
    expect(prismaMock.payment.create).toHaveBeenCalledTimes(1);
  });

  test('guest with a DIFFERENT email gets 403 and the payment row is never written', async () => {
    const res = await call({ body: { email: 'attacker@evil.com' } });
    expect(res.code).toBe(403);
    expectUntouched();
  });

  test('guest with no email at all gets 403', async () => {
    const res = await call({ body: {} });
    expect(res.code).toBe(403);
    expectUntouched();
  });

  test('the overwrite attack: re-initializing someone else\'s PENDING payment is blocked', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(booking);
    prismaMock.payment.findUnique.mockResolvedValue({ id: 9, bookingId: 1, status: 'PENDING', transactionRef: 'victim_ref' });
    const res = makeRes();
    await initializePayment({ body: { bookingId: 1, method: 'CARD', provider: 'PAYSTACK', email: 'attacker@evil.com' } }, res);
    expect(res.code).toBe(403);
    expectUntouched(); // victim's transactionRef is NOT overwritten
  });

  test('the logged-in owner is allowed; another logged-in user is not', async () => {
    expect((await call({ body: {}, user: { id: 70, role: 'CLIENT' } })).code).toBe(201);
    jest.clearAllMocks();
    const other = await call({ body: { email: 'someone@else.com' }, user: { id: 71, role: 'CLIENT' } });
    expect(other.code).toBe(403);
    expectUntouched();
  });

  test('staff may start a payment for a client', async () => {
    expect((await call({ body: {}, user: { id: 1, role: 'STAFF' } })).code).toBe(201);
  });

  test('403 does not leak anything about the booking', async () => {
    const res = await call({ body: { email: 'attacker@evil.com' } });
    expect(JSON.stringify(res.body)).not.toMatch(/owner@example|price|amount|70/i);
  });
});
