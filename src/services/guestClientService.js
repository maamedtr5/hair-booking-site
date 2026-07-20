// src/services/guestClientService.js

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

export async function resolveClientForRequest(req) {
  // --- Logged-in path ---
  if (req.user?.id) {
    const user = await prisma.user.findUnique({
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
   
    const client = await prisma.client.create({
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
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { client: true },
  });

  if (existingUser) {
    if (existingUser.client) {
      return {
        clientId: existingUser.client.id,
        contactEmail: existingUser.email,
        contactPhone: existingUser.client.phone ?? guestPhone,
        contactName: existingUser.name,
      };
    }
    const client = await prisma.client.create({
      data: { userId: existingUser.id, phone: guestPhone },
    });
    return {
      clientId: client.id,
      contactEmail: existingUser.email,
      contactPhone: guestPhone,
      contactName: existingUser.name,
    };
  }


  const randomPassword = crypto.randomBytes(32).toString('hex');
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const newUser = await prisma.user.create({
    data: { name: guestName, email, password: hashedPassword, role: 'CLIENT' },
  });
  const client = await prisma.client.create({
    data: { userId: newUser.id, phone: guestPhone },
  });

  return {
    clientId: client.id,
    contactEmail: newUser.email,
    contactPhone: guestPhone,
    contactName: newUser.name,
  };
}