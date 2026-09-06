function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export interface ExistingBooking {
  start_time: string;
  duration_mins: number;
}

export function getAvailableSlots(
  date: string,
  duration: number,
  existingBookings: ExistingBooking[] = [],
  bufferMinsAfterBooking: number = 30,
  startTime: string = "09:00",
  endTime: string = "20:00"
) {
  if (!date || !Number.isFinite(duration) || duration <= 0) return [];

  const startOfDay = toMinutes(startTime);
  const endOfDay = toMinutes(endTime);

  const slots: string[] = [];
  for (let slot = startOfDay; slot < endOfDay; slot += 30) {
    const slotEnd = slot + duration;
    if (slotEnd > endOfDay) continue;

    // Check for overlaps with existing bookings + their buffer time
    const blocked = existingBookings.some((b) => {
      const bs = toMinutes(b.start_time);
      const be = bs + b.duration_mins + bufferMinsAfterBooking; // Include buffer
      return overlaps(slot, slotEnd, bs, be);
    });

    if (!blocked) slots.push(toTime(slot));
  }
  return slots;
}
