import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

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
    return sendError(res, 'Failed to save consent form', 500, { details: err.message });
  }
}
