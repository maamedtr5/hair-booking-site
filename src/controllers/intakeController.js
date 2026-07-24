import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function createIntakeForm(req, res) {
  try {
    const { clientId, hairType, scalpCondition, productPreference, visitReason,
            lastChemicalTreatment, currentProducts, goals, allergies, notes } = req.body;

    const intake = await prisma.intakeForm.create({
      data: {
        clientId,
        hairType,
        scalpCondition,
        productPreference,
        visitReason,
        lastChemicalTreatment,
        currentProducts,
        goals,
        allergies,
        notes,
      },
    });

    return sendSuccess(res, intake, 201);
  } catch (err) {
    return sendError(res, 'Failed to save intake form', 500, { details: err.message });
  }
}
