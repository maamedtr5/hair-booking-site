// src/utils/availability.js

export const SLOT_INTERVAL_MINUTES = 30;

/**
 * @param {object} params
 * @param {string} params.dateStr - 'YYYY-MM-DD'
 * @param {number[]} params.staffIds - candidate staff to check (>=1)
 * @param {Record<number, Array<[Date, Date]>>} params.busyByStaff - existing
 *        appointment windows per staff id, as [start, end) Date pairs
 * @param {number} params.durationMinutes - length of the service being booked
 * @param {{startMinutes: number, endMinutes: number} | null} params.dayBounds -
 *        open-hours window for this specific date (minutes from midnight),
 *        or null if the salon is closed that day — see getDayBounds() in
 *        businessHours.js. Callers are expected to already have resolved
 *        this for the given date's day-of-week before calling in.
 * @param {number} [params.intervalMinutes]
 * @param {Date} [params.now] - injected for testability; defaults to real now
 * @returns {Array<{ startTime: string, endTime: string, availableStaffIds: number[] }>}
 */
export function computeAvailableSlots({
  dateStr,
  staffIds,
  busyByStaff,
  durationMinutes,
  dayBounds,
  intervalMinutes = SLOT_INTERVAL_MINUTES,
  now = new Date(),
}) {
  if (!dateStr || !Array.isArray(staffIds) || staffIds.length === 0 || !durationMinutes) {
    return [];
  }

  if (!dayBounds) return []; // salon closed this day

  const [year, month, day] = dateStr.split('-').map(Number);
  const results = [];

  for (
    let minutesFromMidnight = dayBounds.startMinutes;
    minutesFromMidnight + durationMinutes <= dayBounds.endMinutes;
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
