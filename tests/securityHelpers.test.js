// tests/securityHelpers.test.js
//
// DB-free unit tests for the access-control helpers added in the security
// pass: token stripping, the "is this service bookable" rule, and the
// consent/intake write-authorization matrix (with a fake Prisma).
import { stripPasswords } from '../src/utils/sanitize.js';
import { isServiceBookable, assertServiceBookable } from '../src/utils/serviceAvailability.js';
import { assertCanWriteForClient } from '../src/utils/clientAccess.js';

describe('stripPasswords — secrets never reach a response', () => {
  test('removes the password hash AND both Google OAuth tokens, at any depth', () => {
    const staff = {
      id: 1,
      bio: 'Master loctician',
      user: {
        id: 9, name: 'Ama', email: 'ama@x.com', password: 'HASH',
        googleAccessToken: 'ya29.secret', googleRefreshToken: '1//refresh-secret',
        googleTokenExpiry: '2026-12-01T00:00:00.000Z',
      },
      appointments: [{ id: 5, staff: { user: { googleRefreshToken: 'nested-secret', name: 'Ama' } } }],
    };
    const out = JSON.stringify(stripPasswords(staff));
    for (const secret of ['HASH', 'ya29.secret', '1//refresh-secret', 'nested-secret']) {
      expect(out).not.toContain(secret);
    }
    expect(out).not.toMatch(/password|googleAccessToken|googleRefreshToken/);
    // ...and everything else survives untouched
    expect(out).toContain('Master loctician');
    expect(out).toContain('ama@x.com');
    expect(out).toContain('googleTokenExpiry');
  });

  test('handles arrays, Dates, null and primitives', () => {
    const d = new Date('2026-10-07T10:00:00Z');
    expect(stripPasswords([{ password: 'x', a: 1 }])).toEqual([{ a: 1 }]);
    expect(stripPasswords(d)).toBe(d);
    expect(stripPasswords(null)).toBeNull();
    expect(stripPasswords('text')).toBe('text');
  });
});

describe('service bookability (service AND category must be active)', () => {
  const svc = (isActive, catActive) => ({ id: 1, isActive, category: { isActive: catActive } });

  test.each([
    [true, true, true],
    [false, true, false], // service switched off
    [true, false, false], // category switched off — the gap this fixes
    [false, false, false],
  ])('service=%s category=%s -> bookable=%s', (s, c, expected) => {
    expect(isServiceBookable(svc(s, c))).toBe(expected);
  });

  test('missing service or missing category is not bookable', () => {
    expect(isServiceBookable(null)).toBe(false);
    expect(isServiceBookable({ isActive: true })).toBe(false);
  });

  test('assert throws 404 for missing, 400 for unavailable, passes otherwise', () => {
    expect(() => assertServiceBookable(null)).toThrow(expect.objectContaining({ status: 404 }));
    expect(() => assertServiceBookable(svc(true, false))).toThrow(
      expect.objectContaining({ status: 400, code: 'SERVICE_UNAVAILABLE', message: 'Service is not available' }),
    );
    expect(() => assertServiceBookable(svc(true, true))).not.toThrow();
  });

  test('thrown errors are plain Errors, so validators/safeErrorMessage show the message', () => {
    try { assertServiceBookable(svc(true, false)); } catch (e) { expect(e.constructor).toBe(Error); }
  });
});

describe('assertCanWriteForClient — who may write onto a client file', () => {
  const HOUR = 3600 * 1000;
  // client 7 belongs to user 70; the booking for appointment 500 was made just now
  const makePrisma = ({ bookingAgeMs = 1000 } = {}) => ({
    client: {
      findUnique: async ({ where }) => (where.id === 7 ? { id: 7, userId: 70 } : where.id === 8 ? { id: 8, userId: 80 } : null),
    },
    booking: {
      findFirst: async ({ where }) =>
        where.appointmentId === 500 && where.clientId === 7
          ? { createdAt: new Date(Date.now() - bookingAgeMs), client: { id: 7, user: { email: 'Guest@Example.com' } } }
          : null,
    },
  });
  const run = (prisma, req, id, opts) => assertCanWriteForClient(prisma, req, id, opts);
  const status = async (p) => p.then(() => 'ok', (e) => e.status);

  test('staff and admin may write for any existing client', async () => {
    for (const role of ['STAFF', 'ADMIN', 'admin']) {
      await expect(run(makePrisma(), { user: { id: 1, role }, body: {} }, 7)).resolves.toMatchObject({ id: 7 });
    }
  });

  test('a client may write only to their OWN client record', async () => {
    await expect(run(makePrisma(), { user: { id: 70, role: 'CLIENT' }, body: {} }, 7)).resolves.toMatchObject({ id: 7 });
    expect(await status(run(makePrisma(), { user: { id: 70, role: 'CLIENT' }, body: {} }, 8))).toBe(403);
  });

  test('logged-in caller targeting a non-existent client gets 404', async () => {
    expect(await status(run(makePrisma(), { user: { id: 1, role: 'ADMIN' }, body: {} }, 999))).toBe(404);
  });

  test('guest with a valid booking proof is allowed (email match is case-insensitive)', async () => {
    const req = { body: { appointmentId: 500, email: ' guest@example.COM ' } };
    await expect(run(makePrisma(), req, 7, { allowGuestProof: true })).resolves.toMatchObject({ id: 7 });
  });

  test.each([
    ['wrong email', { appointmentId: 500, email: 'attacker@x.com' }, 7],
    ['wrong appointment', { appointmentId: 501, email: 'guest@example.com' }, 7],
    ['appointment of a different client', { appointmentId: 500, email: 'guest@example.com' }, 8],
    ['no proof at all', {}, 7],
    ['missing email', { appointmentId: 500 }, 7],
    ['non-numeric appointment id', { appointmentId: 'abc', email: 'guest@example.com' }, 7],
  ])('guest denied with generic 403: %s', async (_n, body, clientId) => {
    expect(await status(run(makePrisma(), { body }, clientId, { allowGuestProof: true }))).toBe(403);
  });

  test('guest proof expires after 24h', async () => {
    const req = { body: { appointmentId: 500, email: 'guest@example.com' } };
    expect(await status(run(makePrisma({ bookingAgeMs: 25 * HOUR }), req, 7, { allowGuestProof: true }))).toBe(403);
    await expect(run(makePrisma({ bookingAgeMs: 23 * HOUR }), req, 7, { allowGuestProof: true })).resolves.toBeTruthy();
  });

  test('guests are rejected outright on endpoints that do not allow proof (intake)', async () => {
    const req = { body: { appointmentId: 500, email: 'guest@example.com' } };
    expect(await status(run(makePrisma(), req, 7))).toBe(401);
  });

  test('a guest cannot learn whether a client id exists (same 403 either way)', async () => {
    const a = await status(run(makePrisma(), { body: { appointmentId: 500, email: 'x@x.com' } }, 7, { allowGuestProof: true }));
    const b = await status(run(makePrisma(), { body: { appointmentId: 500, email: 'x@x.com' } }, 999, { allowGuestProof: true }));
    expect(a).toBe(403);
    expect(b).toBe(403);
  });
});
