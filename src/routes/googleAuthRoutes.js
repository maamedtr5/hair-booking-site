// routes/googleAuthRoutes.js
import express from 'express';
import {
  getAuthUrl,
  getTokensFromCode,
} from '../services/googleCalendarService.js';
import { authenticate } from '../auth/authMiddleware.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

/**
 * GET /auth/google/calendar
 * Redirect user to Google OAuth consent screen
 */
router.get('/google/calendar', authenticate, (req, res) => {
  try {
    const authUrl = getAuthUrl();
    
    // Store user ID in session or pass as state parameter
    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');
    const urlWithState = `${authUrl}&state=${state}`;
    
    res.json({
      success: true,
      authUrl: urlWithState,
      message: 'Redirect user to this URL to authorize Google Calendar access',
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL',
    });
  }
});

/**
 * GET /auth/google/callback
 * Handle OAuth callback from Google
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code not provided',
      });
    }

    // Decode state to get user ID
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Save tokens to database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    console.log(`  Google Calendar connected for user ${userId}`);

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/settings/calendar?success=true`);
  } catch (error) {
    console.error('Error in Google callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/calendar?error=true`);
  }
});

/**
 * DELETE /auth/google/calendar/disconnect
 * Disconnect Google Calendar
 */
router.delete('/google/calendar/disconnect', authenticate, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Calendar',
    });
  }
});

/**
 * GET /auth/google/calendar/status
 * Check if user has connected Google Calendar
 */
router.get('/google/calendar/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        googleRefreshToken: true,
        googleTokenExpiry: true,
      },
    });

    const isConnected = !!user?.googleRefreshToken;

    res.json({
      success: true,
      isConnected,
      tokenExpiry: user?.googleTokenExpiry,
    });
  } catch (error) {
    console.error('Error checking calendar status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check calendar status',
    });
  }
});

export default router;