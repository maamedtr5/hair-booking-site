 // src/app.js

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import jwt from 'jsonwebtoken';
import { authenticate } from './auth/authMiddleware.js';
import { requireRole } from './middleware/roleMiddleware.js';

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

import { getQueueStats } from './jobs/reminderJobs.js';

dotenv.config();


process.env.TZ = process.env.TZ || 'UTC';

const app = express();

// Behind a reverse proxy (Render/Railway/Heroku/Nginx, etc.) Express sees
// the proxy's socket address as req.ip unless told to trust the
// X-Forwarded-For header. Without this, every request in production would
// resolve to the SAME ip in express-rate-limit's default keyGenerator,
// meaning all users — admin, staff, and every client — would share one
// rate-limit bucket and lock each other out. `1` trusts exactly one hop
// (the platform's own edge proxy), which is correct for a single-proxy
// deployment; adjust if a different topology is used in production.
app.set('trust proxy', 1);

let swaggerDocument;
try {
  swaggerDocument = YAML.load(path.join(process.cwd(), 'docs', 'swagger.yaml'));
} catch (_error) {
  console.warn('Swagger documentation not found. Skipping API docs.');
}

app.use(helmet());
app.use(compression());

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

// Best-effort: pull a verified user id out of the Authorization header so
// the rate limiter can bucket by *person* instead of by *device/network*.
// Two different logged-in users (e.g. admin then staff testing on the same
// computer, or a whole salon behind one office IP) must never share a
// budget. Falls back to req.ip for guests/invalid tokens — never throws.
function rateLimitKey(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) return `user:${decoded.id}`;
    } catch {
      // invalid/expired — fall through to IP-based bucketing
    }
  }
  return req.ip;
}

// General API rate limit as a floor for everything else. Auth's own
// login/register limiter (stricter, brute-force-focused) lives in
// authRoutes.js so it doesn't also throttle logout.
//
// windowMs is intentionally short (1 minute, not 15) with a generous cap:
// this is meant to stop abuse/DoS, not to throttle a normal session that
// polls notifications every 30s alongside a dashboard with a few widgets.
// A 15-minute window at the old 300-request ceiling meant one active
// admin dashboard could exhaust the whole bucket well before the window
// reset, and — because the bucket was keyed by IP alone with no trust
// proxy configured — every other role on the same network inherited the
// lockout too.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: { success: false, message: 'Too many requests. Please slow down and try again shortly.' },
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

app.use('/auth', authRoutes);
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

app.get('/jobs/stats', authenticate, requireRole('ADMIN'), async (req, res) => {
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

export default app;