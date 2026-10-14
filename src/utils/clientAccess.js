// src/utils/clientAccess.js
//
// Decides whether the caller may WRITE a record (consent form, intake form)
// onto a given client's file. These endpoints used to be completely open:
// anyone on the internet could POST a signed consent or health intake
// (scalp condition, allergies) for any clientId. Now:
//
//   * logged-in staff/admin           -> any existing client
//   * logged-in client                -> only their own client record
//   * guest (no account, consent only)-> must prove they own the booking they
//     just made: the appointmentId + the booking's contact email, within 24h.
//     That is the same trust model GET /appointments/:id already uses for
//     guests, and it is what the booking page has in hand at that moment.
//
// Every failure a guest can trigger returns the same generic 403 so the
// endpoint can't be used to probe which client/appointment ids exist.

const GUEST_PROOF_WINDOW_MS = 24 * 60 * 60 * 1000;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function assertCanWriteForClient(prisma, req, clientId, { allowGuestProof = false } = {}) {
  if (req.user) {
    const role = String(req.user.role || '').toUpperCase();
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw httpError(404, 'Client not found');
    if (role === 'ADMIN' || role === 'STAFF') return client;
    if (client.userId === req.user.id) return client;
    throw httpError(403, 'Not authorized');
  }

  const denied = () => httpError(403, 'Not authorized');
  if (!allowGuestProof) throw httpError(401, 'Please log in to continue.');

  const appointmentId = Number.parseInt(req.body?.appointmentId, 10);
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!Number.isInteger(appointmentId) || appointmentId < 1 || !email) throw denied();

  const booking = await prisma.booking.findFirst({
    where: { appointmentId, clientId },
    include: { client: { include: { user: { select: { email: true } } } } },
  });
  const ownerEmail = booking?.client?.user?.email?.toLowerCase();
  if (!booking || !ownerEmail || ownerEmail !== email) throw denied();
  if (Date.now() - booking.createdAt.getTime() > GUEST_PROOF_WINDOW_MS) throw denied();

  return booking.client;
}
