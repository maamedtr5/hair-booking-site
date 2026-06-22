import { prisma } from '../config/prisma.js';

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

    res.status(201).json(consent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save consent form', details: err.message });
  }
}
