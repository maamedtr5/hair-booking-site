 // src/services/guestClientService.js

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * `db` is either the top-level `prisma` client or an active transaction
 * client (`tx`). Callers that need this atomic with an appointment/booking
 * write (see appointmentController.createAppointment) MUST pass `tx` —
 * otherwise a guest User+Client can commit here and then the booking write
 * fails downstream (a slot conflict, a transient DB timeout, etc.),
 * leaving an orphaned account with no appointment. That account then
 * permanently blocks the same email from ever booking again with
 * ACCOUNT_EXISTS, even though nothing was actually booked.
 */
export async function resolveClientForRequest(req, db = prisma) {
  // --- Logged-in path ---
  if (req.user?.id) {
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      include: { client: true },
    });
    if (!user) {
      const err = new Error('Authenticated user not found');
      err.status = 401;
      throw err;
    }
    if (user.client) {
      return {
        clientId: user.client.id,
        contactEmail: user.email,
        contactPhone: user.client.phone ?? req.body.guestPhone ?? null,
        contactName: user.name,
      };
    }

    const client = await db.client.create({
      data: { userId: user.id, phone: req.body.guestPhone ?? null },
    });
    return {
      clientId: client.id,
      contactEmail: user.email,
      contactPhone: client.phone,
      contactName: user.name,
    };
  }

  // --- Guest path ---
  const { guestName, guestEmail, guestPhone } = req.body;
  if (!guestName || !guestEmail || !guestPhone) {
    const err = new Error(
      'guestName, guestEmail, and guestPhone are required to book without an account'
    );
    err.status = 400;
    throw err;
  }

  const email = guestEmail.toLowerCase().trim();
  const existingUser = await db.user.findUnique({
    where: { email },
    include: { client: true },
  });

  // A guest checkout is unauthenticated by definition — we have no way to
  // verify the person typing this email actually owns it. Previously, if
  // the email matched a real registered account, the booking was silently
  // attached to that account's client record. That means anyone who knows
  // (or guesses) another person's email can create appointments under
  // their identity with no password required — a low-effort impersonation
  // vector, not just a data-hygiene issue. Block it instead and tell them
  // to sign in, the same way most booking systems handle "this email is
  // already registered."
  if (existingUser) {
    const err = new Error(
      'An account already exists with this email. Please sign in to continue booking, or use a different email to book as a guest.'
    );
    err.status = 409;
    err.code = 'ACCOUNT_EXISTS';
    throw err;
  }

  // Deliberately not retrievable by the guest — this account exists only
  // to hold the Client relation, never to be logged into directly.
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  // A second identical submission (double-click, or a retry fired before
  // the UI had a chance to disable the button) can race this past the
  // findUnique check above — both requests see no existing user, then both
  // try to create one. The DB's unique constraint on email is the real
  // guard; without this catch, the loser of the race throws a raw
  // PrismaClientKnownRequestError (P2002) straight to the global error
  // handler, which — for anything without an explicit err.status — surfaces
  // the internal Prisma message to the client. Convert it to the same
  // friendly, actionable 409 instead.
  let newUser;
  try {
    newUser = await db.user.create({
      data: { name: guestName, email, password: hashedPassword, role: 'CLIENT' },
    });
  } catch (createErr) {
    if (createErr.code === 'P2002') {
      const err = new Error(
        'An account already exists with this email. Please sign in to continue booking, or use a different email to book as a guest.'
      );
      err.status = 409;
      err.code = 'ACCOUNT_EXISTS';
      throw err;
    }
    throw createErr;
  }
  const client = await db.client.create({
    data: { userId: newUser.id, phone: guestPhone },
  });

  return {
    clientId: client.id,
    contactEmail: newUser.email,
    contactPhone: guestPhone,
    contactName: newUser.name,
  };
}