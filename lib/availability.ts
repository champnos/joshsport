import { getBookings, getWorkingHours } from "@/lib/data";
import { Booking } from "@/lib/types";

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function getDayKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .toLowerCase();
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export function getAvailableSlots(date: string, duration: number, bookings: Booking[] = getBookings()) {
  if (!date || !Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  const workingHours = getWorkingHours();
  const dayKey = getDayKey(date);
  const daySchedule = workingHours[dayKey];

  if (!daySchedule?.open) {
    return [];
  }

  const startOfDay = toMinutes(daySchedule.start);
  const endOfDay = toMinutes(daySchedule.end);
  const dateBookings = bookings.filter(
    (booking) => booking.date === date && booking.status !== "cancelled"
  );

  const slots: string[] = [];

  for (let slot = startOfDay; slot < endOfDay; slot += 30) {
    const slotEnd = slot + duration;
    if (slotEnd > endOfDay) {
      continue;
    }

    const blocked = dateBookings.some((booking) => {
      const bookingStart = toMinutes(booking.startTime);
      const bookingEnd = bookingStart + booking.durationMins;
      return overlaps(slot, slotEnd, bookingStart, bookingEnd);
    });

    if (!blocked) {
      slots.push(toTime(slot));
    }
  }

  return slots;
}
