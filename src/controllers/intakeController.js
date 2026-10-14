import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { safeErrorMessage } from '../utils/errorMessages.js';
import { assertCanWriteForClient } from '../utils/clientAccess.js';

export async function createIntakeForm(req, res) {
  try {
    const { hairType, scalpCondition, productPreference, visitReason,
            lastChemicalTreatment, currentProducts, goals, allergies, notes } = req.body;
    const clientId = Number.parseInt(req.body.clientId, 10);

    // Health data (scalp condition, allergies): only the client themself, or
    // staff/admin, may write to a client's intake file.
    await assertCanWriteForClient(prisma, req, clientId);

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
    if (err.status) return sendError(res, safeErrorMessage(err), err.status);
    return sendError(res, safeErrorMessage(err, 'Failed to save intake form. Please try again.'), 500);
  }
}
