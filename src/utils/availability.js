// src/utils/availability.js
//
// Computes bookable time slots for a given day from business hours and
// existing appointments, rather than relying on pre-created "available"
// Slot rows. The Slot model only exists to record a *confirmed*
// appointment's time block (it requires a non-null appointmentId — there
// is no way to represent "open, unbooked" time in that table), so
// availability has to be derived, not looked up.
//
// Pure and DB-free by design so it can be unit tested directly.

export const BUSINESS_START_HOUR = 9;  // 9am
export const BUSINESS_END_HOUR = 18;   // 6pm
export const SLOT_INTERVAL_MINUTES = 30;

/**
 * @param {object} params
 * @param {string} params.dateStr - 'YYYY-MM-DD'
 * @param {number[]} params.staffIds - candidate staff to check (>=1)
 * @param {Record<number, Array<[Date, Date]>>} params.busyByStaff - existing
 *        appointment windows per staff id, as [start, end) Date pairs
 * @param {number} params.durationMinutes - length of the service being booked
 * @param {number} [params.intervalMinutes]
 * @param {number} [params.startHour]
 * @param {number} [params.endHour]
 * @param {Date} [params.now] - injected for testability; defaults to real now
 * @returns {Array<{ startTime: string, endTime: string, availableStaffIds: number[] }>}
 */
export function computeAvailableSlots({
  dateStr,
  staffIds,
  busyByStaff,
  durationMinutes,
  intervalMinutes = SLOT_INTERVAL_MINUTES,
  startHour = BUSINESS_START_HOUR,
  endHour = BUSINESS_END_HOUR,
  now = new Date(),
}) {
  if (!dateStr || !Array.isArray(staffIds) || staffIds.length === 0 || !durationMinutes) {
    return [];
  }

  const [year, month, day] = dateStr.split('-').map(Number);

  // Business days are Monday–Saturday — matches isBusinessHours() in
  // validationHelpers.js, which the booking-creation endpoint enforces.
  // A slot computed as "available" here must be bookable there too.
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  if (dayOfWeek === 0) return [];

  const results = [];

  for (
    let minutesFromMidnight = startHour * 60;
    minutesFromMidnight + durationMinutes <= endHour * 60;
    minutesFromMidnight += intervalMinutes
  ) {
    const slotStart = new Date(year, month - 1, day, 0, minutesFromMidnight, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

    // Skip anything already in the past (same-day booking).
    if (slotStart < now) continue;

    const freeStaffIds = staffIds.filter((id) => {
      const busy = busyByStaff[id] || [];
      return !busy.some(([busyStart, busyEnd]) => slotStart < busyEnd && slotEnd > busyStart);
    });

    if (freeStaffIds.length > 0) {
      results.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        availableStaffIds: freeStaffIds,
      });
    }
  }

  return results;
}
