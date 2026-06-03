// src/Server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
import { env } from './config/env.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';



// Import routes
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
import googleAuthRoutes from './routes/googleAuthRoutes.js';

// Import background jobs and services
import { scheduleDailyReminders, getQueueStats, restoreRemindersOnStartup }from './jobs/reminderJobs.js';
import { verifyEmailConfig } from './services/emailService.js';
import { verifySMSConfig } from './services/smsService.js';
import { verifyCalendarConfig } from './services/googleCalendarService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Load Swagger documentation
let swaggerDocument;
try {
  swaggerDocument = YAML.load(
    path.join(process.cwd(), 'docs', 'swagger.yaml')
  );
} catch (error) {
  console.warn('Swagger documentation not found. Skipping API docs.');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format',
      error: err.message,
    });
  }
  next();
});

// Swagger UI
if (swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('API Documentation available at /api-docs');
}

import { errorHandler } from './utils/errorHandler.js';

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hair Booking API is running',
    version: '1.0.0',
    endpoints: {
      docs: '/api-docs',
      health: '/health',
      auth: '/auth',
      users: '/users',
      clients: '/clients',
      staff: '/staff',
      admin: '/admin',
      appointments: '/appointments',
      bookings: '/bookings',
      services: '/services',
      payments: '/payments',
      promocodes: '/promocodes',
      reviews: '/reviews',
      forms: '/forms',
      settings: '/settings',
      waitlist: '/waitlist',
      notifications: '/notifications',
      reports: '/reports',
      slots: '/slots',
      webhooks: '/webhooks',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
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
app.use('/webhooks/paystack', express.raw({ type: '*/*' }), webhookRoutes);

// Jobs monitoring
app.get('/jobs/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve job stats',
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Background jobs
// Background jobs
const initializeJobs = async () => {
  try {
    console.log('Initializing background jobs...');
    const emailConfigured = await verifyEmailConfig();
    const smsConfigured = verifySMSConfig();
    const calendarConfigured = verifyCalendarConfig();

    if (!emailConfigured && !smsConfigured) {
      console.warn('Neither email nor SMS configured. Reminders will not be sent.');
    }
    if (!calendarConfigured) {
      console.warn('Google Calendar not configured. Calendar sync disabled.');
    }

    await scheduleDailyReminders();
    await restoreRemindersOnStartup();   // ✅ restore persisted appointment reminders

    console.log('Background jobs initialized successfully');
  } catch (error) {
    console.error('Error initializing background jobs:', error);
  }
};


// Server start
app.listen(PORT, async () => {
  console.log(`Hair Booking Backend running at http://localhost:${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  await initializeJobs();
  console.log('Server ready to accept requests');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received: closing server');
  process.exit(0);
});
