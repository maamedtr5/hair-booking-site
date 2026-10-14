import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { safeErrorMessage } from '../utils/errorMessages.js';
import { assertCanWriteForClient } from '../utils/clientAccess.js';

export async function createConsentForm(req, res) {
  try {
    const { consentGiven, signature } = req.body;
    const clientId = Number.parseInt(req.body.clientId, 10);

    // Guests (no account) may file consent right after booking, but only by
    // proving they own that booking — see utils/clientAccess.js.
    await assertCanWriteForClient(prisma, req, clientId, { allowGuestProof: true });

    const consent = await prisma.consentForm.create({
      data: { clientId, consentGiven, signature },
    });

    return sendSuccess(res, consent, 201);
  } catch (err) {
    if (err.status) return sendError(res, safeErrorMessage(err), err.status);
    return sendError(res, safeErrorMessage(err, 'Failed to save consent form. Please try again.'), 500);
  }
}
