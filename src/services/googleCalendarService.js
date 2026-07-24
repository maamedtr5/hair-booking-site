// services/googleCalendarService.js
import { google } from 'googleapis';
import { prisma } from '../lib/prisma.js';


// OAuth2 client configuration
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set up Calendar API
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

/**
 * Generate OAuth URL for user to authorize
 */
export const getAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force to get refresh token
  });
};

/**
 * Exchange authorization code for tokens
 */
export const getTokensFromCode = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw error;
  }
};

/**
 * Set credentials for OAuth client
 */
export const setCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
};

/**
 * Refresh access token if expired
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

/**
 * Get user's calendar tokens from database
 */
const getUserCalendarTokens = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
      },
    });

    if (!user || !user.googleRefreshToken) {
      throw new Error('User not connected to Google Calendar');
    }

    // Check if token is expired
    if (user.googleTokenExpiry && new Date(user.googleTokenExpiry) < new Date()) {
      // Refresh the token
      const newTokens = await refreshAccessToken(user.googleRefreshToken);
      
      // Update tokens in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: newTokens.access_token,
          googleTokenExpiry: new Date(newTokens.expiry_date),
        },
      });

      return {
        access_token: newTokens.access_token,
        refresh_token: user.googleRefreshToken,
      };
    }

    return {
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    };
  } catch (error) {
    console.error('Error getting user calendar tokens:', error);
    throw error;
  }
};

/**
 * Create a calendar event for an appointment
 */
export const createCalendarEvent = async (userId, appointmentData) => {
  try {
    // Get user's tokens
    const tokens = await getUserCalendarTokens(userId);
    setCredentials(tokens);

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      attendeeEmail,
      appointmentId,
    } = appointmentData;

    // Create event object
    const event = {
      summary: title || 'Hair Appointment',
      description: description || 'Appointment booked via Hair Booking System',
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: 'Africa/Accra',
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: 'Africa/Accra',
      },
      location: location || process.env.BUSINESS_ADDRESS,
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
      colorId: '9', // Blue color
      extendedProperties: {
        private: {
          appointmentId: appointmentId || '',
          source: 'hair_booking_system',
        },
      },
    };

    // Create the event
    const response = await calendar.events.insert({
      calendarId: 'primary',    
      requestBody: event,
      sendUpdates: 'all', // Send email notifications to attendees
    });

    console.log(`  Calendar event created: ${response.data.id}`);
    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error('❌ Error creating calendar event:', error.message);
    throw error;
  }
};

/**
 * Update an existing calendar event
 */
export const updateCalendarEvent = async (userId, eventId, updates) => {
  try {
    const tokens = await getUserCalendarTokens(userId);
    setCredentials(tokens);

    const { title, description, startTime, endTime, location, attendeeEmail } = updates;

    const event = {
      summary: title,
      description: description,
      start: startTime ? {
        dateTime: new Date(startTime).toISOString(),
        timeZone: 'Africa/Accra',
      } : undefined,
      end: endTime ? {
        dateTime: new Date(endTime).toISOString(),
        timeZone: 'Africa/Accra',
      } : undefined,
      location: location,
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
    };

    // Remove undefined fields
    Object.keys(event).forEach(key => event[key] === undefined && delete event[key]);

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
      sendUpdates: 'all',
    });

    console.log(`  Calendar event updated: ${response.data.id}`);
    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error('❌ Error updating calendar event:', error.message);
    throw error;
  }
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (userId, eventId) => {
  try {
    const tokens = await getUserCalendarTokens(userId);
    setCredentials(tokens);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all',
    });

    console.log(`  Calendar event deleted: ${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting calendar event:', error.message);
    throw error;
  }
};

/**
 * Get a calendar event
 */
export const getCalendarEvent = async (userId, eventId) => {
  try {
    const tokens = await getUserCalendarTokens(userId);
    setCredentials(tokens);

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error getting calendar event:', error.message);
    throw error;
  }
};

/**
 * List upcoming calendar events
 */
export const listUpcomingEvents = async (userId, maxResults = 10) => {
  try {
    const tokens = await getUserCalendarTokens(userId);
    setCredentials(tokens);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('❌ Error listing events:', error.message);
    throw error;
  }
};

/**
 * Check for calendar conflicts
 */
export const checkCalendarConflicts = async (userId, startTime, endTime) => {
  try {
    const tokens = await getUserCalendarTokens(userId);
    setCredentials(tokens);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date(startTime).toISOString(),
        timeMax: new Date(endTime).toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busySlots = response.data.calendars.primary.busy || [];
    const hasConflict = busySlots.length > 0;

    return {
      hasConflict,
      conflicts: busySlots,
    };
  } catch (error) {
    console.error('❌ Error checking conflicts:', error.message);
    throw error;
  }
};

/**
 * Get available time slots
 */
export const getAvailableSlots = async (userId, date, duration = 60) => {
  try {
    const tokens = await getUserCalendarTokens(userId);
    setCredentials(tokens);

    const startOfDay = new Date(date);
    startOfDay.setHours(9, 0, 0, 0); // 9 AM

    const endOfDay = new Date(date);
    endOfDay.setHours(18, 0, 0, 0); // 6 PM

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busySlots = response.data.calendars.primary.busy || [];
    const availableSlots = [];

    let currentTime = new Date(startOfDay);
    const slotDuration = duration * 60 * 1000; // Convert to milliseconds

    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration);

      // Check if this slot conflicts with any busy period
      const hasConflict = busySlots.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return (
          (currentTime >= busyStart && currentTime < busyEnd) ||
          (slotEnd > busyStart && slotEnd <= busyEnd) ||
          (currentTime <= busyStart && slotEnd >= busyEnd)
        );
      });

      if (!hasConflict) {
        availableSlots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      currentTime = slotEnd;
    }

    return availableSlots;
  } catch (error) {
    console.error('❌ Error getting available slots:', error.message);
    throw error;
  }
};

/**
 * Sync appointment to staff's calendar
 */
export const syncAppointmentToStaffCalendar = async (appointmentId) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          include: { user: true },
        },
        service: true,
        staff: true,
      },
    });

    if (!appointment || !appointment.staff) {
      throw new Error('Appointment or staff not found');
    }

    const staffUserId = appointment.staff.userId || appointment.staff.id;

    // Calculate end time based on service duration
    const startTime = new Date(appointment.appointmentDateTime || appointment.appointmentDate);
    const endTime = new Date(startTime.getTime() + (appointment.service?.duration || 60) * 60000);

    const eventData = {
      title: `${appointment.service?.name || 'Appointment'} - ${appointment.client?.user?.name || 'Client'}`,
      description: `
        Client: ${appointment.client?.user?.name || 'N/A'}
        Phone: ${appointment.client?.user?.phone || appointment.client?.phone || 'N/A'}
        Email: ${appointment.client?.user?.email || appointment.client?.email || 'N/A'}
        Service: ${appointment.service?.name || 'N/A'}
        Price: GH₵ ${appointment.service?.price || 'N/A'}
        Status: ${appointment.status || 'pending'}
      `.trim(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: process.env.BUSINESS_ADDRESS,
      attendeeEmail: appointment.client?.user?.email || appointment.client?.email,
      appointmentId: appointment.id,
    };

    const result = await createCalendarEvent(staffUserId, eventData);

    // Save event ID to appointment
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { googleEventId: result.eventId },
    });

    return result;
  } catch (error) {
    console.error('❌ Error syncing appointment to calendar:', error.message);
    throw error;
  }
};

/**
 * Verify calendar service is configured
 */
export const verifyCalendarConfig = () => {
  const isConfigured = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );

  if (isConfigured) {
    console.log('  Google Calendar service is configured');
  } else {
    console.warn('⚠️ Google Calendar service not configured');
    console.warn('   Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to .env');
  }

  return isConfigured;
};
