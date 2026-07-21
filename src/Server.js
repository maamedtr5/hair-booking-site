// src/Server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import adminRoutes from "./routes/adminRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import userRoutes from './routes/userRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import formRoutes from './routes/formRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import promocodeRoutes from './routes/promocodeRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import authRoutes from './auth/authRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import intakeRoutes from './routes/intakeRoutes.js';
import googleAuthRoutes from './routes/googleAuthRoutes.js';

import { scheduleDailyReminders, getQueueStats } from './jobs/reminderJobs.js';
import { scheduleSessionCleanup } from './jobs/sessionCleanup.js';
import { verifyEmailConfig } from './services/emailService.js';
import { verifySMSConfig } from './services/smsService.js';
import { verifyCalendarConfig } from './services/googleCalendarService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

let swaggerDocument;
try {
  swaggerDocument = YAML.load(path.join(process.cwd(), 'docs', 'swagger.yaml'));
} catch (_error) {
  console.warn('Swagger documentation not found. Skipping API docs.');
}

app.use(helmet());

// Only the frontend origin(s) may call this API with credentials.
// Set FRONTEND_URL in .env (comma-separated for multiple, e.g. staging).
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Capture the raw body for webhook signature verification, while still
// parsing JSON normally for everything else.
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Throttle auth endpoints specifically — brute force / credential stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

// General API rate limit as a floor for everything else.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use((err, req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON format' });
  }
  _next(err);
});

if (swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('API Documentation available at /api-docs');
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hair Booking API is running',
    version: '1.0.0',
    endpoints: {
      docs: '/api-docs', health: '/health', auth: '/auth', users: '/users',
      clients: '/clients', staff: '/staff', admin: '/admin',
      appointments: '/appointments', bookings: '/bookings', services: '/services',
      payments: '/payments', promocodes: '/promocodes', reviews: '/reviews',
      forms: '/forms', settings: '/settings', waitlist: '/waitlist',
      notifications: '/notifications', reports: '/reports', slots: '/slots',
      webhooks: '/webhooks',
      consent: '/consent',
      intake: '/intake', 
      
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/auth', googleAuthRoutes);
app.use('/users', userRoutes);
app.use('/clients', clientRoutes);
app.use('/staff', staffRoutes);
app.use('/admin', adminRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/bookings', bookingRoutes);
app.use('/services', serviceRoutes);
app.use('/payments', paymentRoutes);
app.use('/promocodes', promocodeRoutes);
app.use('/reviews', reviewRoutes);
app.use('/forms', formRoutes);
app.use('/settings', settingsRoutes);
app.use('/waitlist', waitlistRoutes);
app.use('/notifications', notificationRoutes);
app.use('/reports', reportRoutes);
app.use('/slots', slotRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/consent', consentRoutes);
app.use('/intake', intakeRoutes);

app.get('/jobs/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve job stats' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found', path: req.path });
});

app.use((err, req, res, _next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const initializeJobs = async () => {
  try {
    console.log('Initializing background jobs...');
    const emailConfigured = await verifyEmailConfig();
    const smsConfigured = verifySMSConfig();
    const calendarConfigured = verifyCalendarConfig();
    if (!emailConfigured && !smsConfigured) console.warn('Neither email nor SMS configured.');
    if (!calendarConfigured) console.warn('Google Calendar not configured.');
    await scheduleDailyReminders();
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