import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { safeErrorMessage } from '../utils/errorMessages.js';

export async function createConsentForm(req, res) {
  try {
    const { clientId, consentGiven, signature } = req.body;

    const consent = await prisma.consentForm.create({
      data: {
        clientId,
        consentGiven,
        signature,
      },
    });

    return sendSuccess(res, consent, 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err, 'Failed to save consent form. Please try again.'), 500);
  }
}
