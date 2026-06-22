import { prisma } from '../config/prisma.js';

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

    res.status(201).json(intake);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save intake form', details: err.message });
  }
}
