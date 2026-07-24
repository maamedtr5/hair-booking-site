// src/Server.js
//
// Process entry point. Owns starting the HTTP listener, background jobs,
// and shutdown signals. The Express app itself lives in app.js so it can
// be imported by tests without any of this running.
import app from './app.js';
import { scheduleDailyReminders } from './jobs/reminderJobs.js';
import { scheduleSessionCleanup } from './jobs/sessionCleanup.js';
import { verifyEmailConfig } from './services/emailService.js';
import { verifySMSConfig } from './services/smsService.js';
import { verifyCalendarConfig } from './services/googleCalendarService.js';

const PORT = process.env.PORT || 5001;

const initializeJobs = async () => {
  try {
    console.log('Initializing background jobs...');
    const emailConfigured = await verifyEmailConfig();
    const smsConfigured = verifySMSConfig();
    const calendarConfigured = verifyCalendarConfig();
    if (!emailConfigured && !smsConfigured) console.warn('Neither email nor SMS configured.');
    if (!calendarConfigured) console.warn('Google Calendar not configured.');
    await scheduleDailyReminders();
    // Was imported but never invoked — stale sessions (expired/revoked >7
    // days ago) were never actually purged from the database.
    scheduleSessionCleanup();
    console.log('Background jobs initialized successfully');
  } catch (_error) {
    console.error('Error initializing background jobs:', _error);
  }
};

app.listen(PORT, async () => {
  console.log(`Hair Booking Backend running at http://localhost:${PORT}`);
  await initializeJobs();
  console.log('Server ready to accept requests');
});

process.on('SIGTERM', () => { console.log('SIGTERM received'); process.exit(0); });
process.on('SIGINT', () => { console.log('SIGINT received'); process.exit(0); });
