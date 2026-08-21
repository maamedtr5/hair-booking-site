import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { safeErrorMessage } from '../utils/errorMessages.js';

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
    return sendError(res, safeErrorMessage(err, 'Failed to save intake form. Please try again.'), 500);
  }
}
