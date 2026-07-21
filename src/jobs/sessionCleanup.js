// src/jobs/sessionCleanupJob.js
import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

export function scheduleSessionCleanup() {
  // Daily at 3am — deletes sessions that expired or were revoked more than 7 days ago.
  cron.schedule('0 3 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { count } = await prisma.session.deleteMany({
        where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
      });
      console.log(`Session cleanup: removed ${count} stale sessions`);
    } catch (err) {
      console.error('Session cleanup failed:', err.message);
    }
  });
}