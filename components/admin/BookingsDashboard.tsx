"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { Booking } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BookingsDashboardProps {
  adminToken: string;
  onUnauthorized: () => void;
}

const STATUS_OPTIONS = ["all", "pending_payment", "pending", "confirmed", "completed", "cancelled"] as const;

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", options ?? {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function bookingDateTime(booking: Booking) {
  return new Date(`${booking.date}T${booking.start_time}:00`).getTime();
}

function isPendingStatus(status: Booking["status"]) {
  return status === "pending" || status === "pending_payment";
}

function statusClasses(status: Booking["status"]) {
  if (status === "completed") return "bg-blue-100 text-blue-800";
  if (status === "confirmed") return "bg-green-100 text-green-800";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  return "bg-brand-gold/20 text-brand-blue";
}

function statusPriority(status: Booking["status"]) {
  if (isPendingStatus(status)) return 0;
  if (status === "confirmed") return 1;
  if (status === "completed") return 2;
  return 3;
}

function getMonthGrid(currentMonth: Date) {
  const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const leading = (start.getDay() + 6) % 7;
  const cells: Array<{ date: string | null; day: number | null }> = [];

  for (let i = 0; i < leading; i += 1) {
    cells.push({ date: null, day: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, day });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }

  return cells;
}

export default function BookingsDashboard({ adminToken, onUnauthorized }: BookingsDashboardProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const headers = useMemo(
    () => ({ "x-admin-password": adminToken, "Content-Type": "application/json" }),
    [adminToken],
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", { headers });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to load bookings.");
      }

      const data = (await response.json()) as Booking[];
      setBookings(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [headers, onUnauthorized]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId],
  );

  useEffect(() => {
    if (!selectedBooking) {
      setShowReschedule(false);
      return;
    }

    setRescheduleDate(selectedBooking.date);
    setRescheduleTime(selectedBooking.start_time);
    setAvailableSlots([]);
  }, [selectedBooking]);

  const sortedBookings = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return [...bookings].sort((left, right) => {
      const leftUpcoming = bookingDateTime(left) >= startOfToday.getTime();
      const rightUpcoming = bookingDateTime(right) >= startOfToday.getTime();

      if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;

      const leftPriority = statusPriority(left.status);
      const rightPriority = statusPriority(right.status);
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;

      if (leftUpcoming) {
        return bookingDateTime(left) - bookingDateTime(right);
      }

      return bookingDateTime(right) - bookingDateTime(left);
    });
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return sortedBookings.filter((booking) => {
      if (
        statusFilter !== "all" &&
        !(statusFilter === "pending" ? isPendingStatus(booking.status) : booking.status === statusFilter)
      ) {
        return false;
      }
      if (dateFilter && booking.date !== dateFilter) return false;
      if (!term) return true;

      return [
        booking.client_name,
        booking.client_email ?? "",
        booking.treatment_name,
        booking.client_phone,
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [dateFilter, searchTerm, sortedBookings, statusFilter]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();

    for (const booking of bookings) {
      const existing = map.get(booking.date) ?? [];
      existing.push(booking);
      existing.sort((left, right) => bookingDateTime(left) - bookingDateTime(right));
      map.set(booking.date, existing);
    }

    return map;
  }, [bookings]);

  const currentMonthStats = useMemo(() => {
    const key = monthKey(new Date());
    const monthBookings = bookings.filter((booking) => booking.date.startsWith(key));

    return {
      total: monthBookings.length,
      pending: monthBookings.filter((booking) => isPendingStatus(booking.status)).length,
      completed: monthBookings.filter((booking) => booking.status === "completed").length,
      cancelled: monthBookings.filter((booking) => booking.status === "cancelled").length,
    };
  }, [bookings]);

  const pendingBookings = useMemo(
    () => sortedBookings.filter((booking) => isPendingStatus(booking.status)),
    [sortedBookings],
  );

  const fetchAvailableSlots = useCallback(async (booking: Booking, nextDate: string) => {
    if (!nextDate) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    setActionError("");

    try {
      const response = await fetch(`/api/availability?date=${encodeURIComponent(nextDate)}&duration=${booking.duration_mins}`);
      const payload = await response.json().catch(() => null);
      const slots = Array.isArray(payload?.slots) ? payload.slots as string[] : [];
      const nextSlots = nextDate === booking.date && !slots.includes(booking.start_time)
        ? [...slots, booking.start_time].sort()
        : slots;
      setAvailableSlots(nextSlots);
      setRescheduleTime((currentTime) => (
        nextSlots.includes(currentTime) ? currentTime : nextSlots[0] ?? ""
      ));
    } catch {
      setAvailableSlots([]);
      setActionError("Failed to load available reschedule slots.");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBooking || !showReschedule || !rescheduleDate) return;
    void fetchAvailableSlots(selectedBooking, rescheduleDate);
  }, [fetchAvailableSlots, rescheduleDate, selectedBooking, showReschedule]);

  const updateBooking = useCallback(async (
    bookingId: string,
    payload: Partial<Pick<Booking, "status" | "date" | "start_time">>,
    successMessage: string,
  ) => {
    setSavingBookingId(bookingId);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setActionError(data?.error ?? "Unable to update booking.");
        return;
      }

      const updatedBooking = data as Booking;
      setBookings((current) => current.map((booking) => (
        booking.id === bookingId ? updatedBooking : booking
      )));
      setActionSuccess(successMessage);
      setSelectedBookingId(updatedBooking.id);
      setShowReschedule(false);
    } catch {
      setActionError("Unable to update booking.");
    } finally {
      setSavingBookingId(null);
    }
  }, [headers, onUnauthorized]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("");
  };

  const monthCells = getMonthGrid(currentMonth);
  const selectedMedicalConditions = Array.isArray(selectedBooking?.medical_conditions)
    ? selectedBooking.medical_conditions
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-brand-blue to-blue-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-gold">Josh&apos;s dashboard</p>
            <h2 className="mt-2 text-3xl font-bold">Bookings overview</h2>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">
              Pending bookings are highlighted, upcoming appointments are listed first, and all actions stay behind the existing admin-protected APIs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBookings()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh bookings
          </button>
        </div>
      </div>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {actionError && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}
      {actionSuccess && <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{actionSuccess}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total this month", value: currentMonthStats.total, accent: "border-brand-blue/20 bg-white" },
          { label: "Pending", value: currentMonthStats.pending, accent: "border-brand-gold/50 bg-brand-gold/10" },
          { label: "Completed", value: currentMonthStats.completed, accent: "border-blue-200 bg-blue-50" },
          { label: "Cancelled", value: currentMonthStats.cancelled, accent: "border-red-200 bg-red-50" },
        ].map((item) => (
          <div key={item.label} className={cn("rounded-2xl border p-5 shadow-sm", item.accent)}>
            <p className="text-sm font-medium text-gray-600">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-brand-blue">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-brand-blue">Calendar view</h3>
              <p className="text-sm text-gray-500">All bookings for the selected month. Click a day to filter the list.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-brand-blue hover:text-brand-blue"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="min-w-32 text-center text-sm font-semibold text-brand-blue">
                {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(currentMonth)}
              </p>
              <button
                type="button"
                onClick={() => setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-brand-blue hover:text-brand-blue"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <div key={label} className="pb-2">{label}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {monthCells.map((cell, index) => {
                  const dayBookings = cell.date ? bookingsByDate.get(cell.date) ?? [] : [];
                  const hasPending = dayBookings.some((booking) => isPendingStatus(booking.status));
                  const isSelected = cell.date !== null && cell.date === dateFilter;

                  return (
                    <button
                      key={`${cell.date ?? "empty"}-${index}`}
                      type="button"
                      disabled={!cell.date}
                      onClick={() => setDateFilter(cell.date ?? "")}
                      className={cn(
                        "min-h-28 rounded-2xl border p-3 text-left align-top transition",
                        cell.date ? "bg-white hover:border-brand-blue" : "cursor-default border-transparent bg-transparent",
                        hasPending && "border-brand-gold bg-brand-gold/10",
                        isSelected && "border-brand-blue ring-2 ring-brand-blue/20",
                      )}
                    >
                      {cell.day && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-brand-blue">{cell.day}</span>
                            {dayBookings.length > 0 && (
                              <span className="rounded-full bg-brand-blue px-2 py-0.5 text-[10px] font-semibold text-white">
                                {dayBookings.length}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1">
                            {dayBookings.slice(0, 3).map((booking) => (
                              <div
                                key={booking.id}
                                className={cn(
                                  "rounded-lg px-2 py-1 text-[11px] font-medium",
                                  isPendingStatus(booking.status) ? "bg-brand-gold/20 text-brand-blue" : "bg-gray-100 text-gray-700",
                                )}
                              >
                                {formatTime(booking.start_time)} · {booking.client_name}
                              </div>
                            ))}
                            {dayBookings.length > 3 && (
                              <p className="text-[11px] text-gray-500">+{dayBookings.length - 3} more</p>
                            )}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-brand-blue">Pending attention</h3>
              <p className="text-sm text-gray-500">Bookings that likely need action first.</p>
            </div>
            <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-brand-blue">
              {pendingBookings.length} awaiting payment
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {pendingBookings.slice(0, 5).map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedBookingId(booking.id)}
                className="w-full rounded-2xl border border-brand-gold/50 bg-brand-gold/10 p-4 text-left transition hover:border-brand-blue"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-brand-blue">{booking.client_name}</p>
                  <span className="text-xs font-semibold text-brand-blue">{formatDate(booking.date, { day: "numeric", month: "short" })}</span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{booking.treatment_name}</p>
                <p className="mt-1 text-sm text-gray-500">{formatTime(booking.start_time)}</p>
              </button>
            ))}
            {pendingBookings.length === 0 && (
              <p className="rounded-2xl bg-gray-50 px-4 py-6 text-sm text-gray-500">No bookings are awaiting payment right now.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-brand-blue">Booking list</h3>
            <p className="text-sm text-gray-500">Upcoming bookings first, with filters for client, date, and status.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_180px_180px_auto]">
            <label className="relative block">
              <span className="sr-only">Search bookings</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client, email, phone, treatment"
                className="w-full rounded-xl border border-gray-200 px-10 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number])}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === "all"
                    ? "All statuses"
                    : status
                        .split("_")
                        .map((part) => part[0].toUpperCase() + part.slice(1))
                        .join(" ")}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
            />

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-brand-blue hover:text-brand-blue"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading && <p className="text-sm text-gray-500">Loading bookings…</p>}
          {!loading && filteredBookings.length === 0 && (
            <p className="rounded-2xl bg-gray-50 px-4 py-8 text-sm text-gray-500">No bookings match the current filters.</p>
          )}

          {!loading && filteredBookings.map((booking) => (
            <article
              key={booking.id}
              className={cn(
                "rounded-3xl border p-5 shadow-sm transition",
                isPendingStatus(booking.status) ? "border-brand-gold/50 bg-brand-gold/5" : "border-gray-200 bg-white",
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-lg font-bold text-brand-blue">{booking.client_name}</h4>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", statusClasses(booking.status))}>
                      {booking.status.replace("_", " ")}
                    </span>
                    {isPendingStatus(booking.status) && (
                      <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-brand-blue">Needs attention</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700">{booking.treatment_name} · {booking.duration_mins} mins</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
                    <span>{formatDate(booking.date)}</span>
                    <span>{formatTime(booking.start_time)}</span>
                    <span>{booking.client_phone}</span>
                    <span>{booking.client_email || "No email on file"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="rounded-xl border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-blue hover:text-white"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateBooking(booking.id, { status: "confirmed" }, "Booking marked as confirmed.")}
                    disabled={savingBookingId === booking.id || booking.status === "confirmed"}
                    className="rounded-xl border border-green-200 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateBooking(booking.id, { status: "completed" }, "Booking marked as completed.")}
                    disabled={savingBookingId === booking.id || booking.status === "completed"}
                    className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark completed
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateBooking(booking.id, { status: "cancelled" }, "Booking cancelled.")}
                    disabled={savingBookingId === booking.id || booking.status === "cancelled"}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue/70 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold text-brand-blue">{selectedBooking.client_name}</h3>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", statusClasses(selectedBooking.status))}>
                    {selectedBooking.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {selectedBooking.treatment_name} · {selectedBooking.duration_mins} mins · {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.start_time)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingId(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-blue hover:text-brand-blue"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-5">
                <h4 className="text-sm font-bold uppercase tracking-wide text-brand-blue">Client details</h4>
                <dl className="mt-4 space-y-2 text-sm text-gray-700">
                  <div><dt className="font-semibold text-gray-500">Email</dt><dd>{selectedBooking.client_email || "Not provided"}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Phone</dt><dd>{selectedBooking.client_phone}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Date of birth</dt><dd>{selectedBooking.client_dob}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Address</dt><dd>{selectedBooking.client_address}, {selectedBooking.client_postcode}</dd></div>
                </dl>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <h4 className="text-sm font-bold uppercase tracking-wide text-brand-blue">Emergency contact</h4>
                <dl className="mt-4 space-y-2 text-sm text-gray-700">
                  <div><dt className="font-semibold text-gray-500">Name</dt><dd>{selectedBooking.emergency_name || "Not provided"}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Relationship</dt><dd>{selectedBooking.emergency_relationship || "Not provided"}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Phone</dt><dd>{selectedBooking.emergency_phone || "Not provided"}</dd></div>
                </dl>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <h4 className="text-sm font-bold uppercase tracking-wide text-brand-blue">Medical history</h4>
                <div className="mt-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-500">Conditions</p>
                  <p className="mt-1">{selectedMedicalConditions.length > 0 ? selectedMedicalConditions.join(", ") : "None reported"}</p>
                  <p className="mt-4 font-semibold text-gray-500">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{selectedBooking.medical_notes || "No additional notes."}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <h4 className="text-sm font-bold uppercase tracking-wide text-brand-blue">Injury history</h4>
                <div className="mt-4 space-y-4 text-sm text-gray-700">
                  <div>
                    <p className="font-semibold text-gray-500">Recent injury or surgery</p>
                    <p className="mt-1">{selectedBooking.injury_recent ? "Yes" : "No"}</p>
                    <p className="mt-1 whitespace-pre-wrap">{selectedBooking.injury_recent_notes || "No details provided."}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Previous injuries</p>
                    <p className="mt-1">{selectedBooking.injury_previous ? "Yes" : "No"}</p>
                    <p className="mt-1 whitespace-pre-wrap">{selectedBooking.injury_previous_notes || "No details provided."}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-lg font-bold text-brand-blue">Booking actions</h4>
                  <p className="text-sm text-gray-500">Update status or move the appointment if another slot is available.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void updateBooking(selectedBooking.id, { status: "confirmed" }, "Booking marked as confirmed.")}
                    disabled={savingBookingId === selectedBooking.id || selectedBooking.status === "confirmed"}
                    className="rounded-xl border border-green-200 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateBooking(selectedBooking.id, { status: "completed" }, "Booking marked as completed.")}
                    disabled={savingBookingId === selectedBooking.id || selectedBooking.status === "completed"}
                    className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark completed
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateBooking(selectedBooking.id, { status: "cancelled" }, "Booking cancelled.")}
                    disabled={savingBookingId === selectedBooking.id || selectedBooking.status === "cancelled"}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel booking
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReschedule((current) => !current)}
                    className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    {showReschedule ? "Hide reschedule" : "Reschedule"}
                  </button>
                </div>
              </div>

              {showReschedule && (
                <div className="mt-5 grid gap-4 lg:grid-cols-[180px_1fr_auto]">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-brand-blue">New date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(event) => setRescheduleDate(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-brand-blue">Available times</label>
                    <select
                      value={rescheduleTime}
                      onChange={(event) => setRescheduleTime(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                      disabled={loadingSlots || availableSlots.length === 0}
                    >
                      {availableSlots.length === 0 && <option value="">No available slots</option>}
                      {availableSlots.map((slot) => (
                        <option key={slot} value={slot}>{formatTime(slot)}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      {loadingSlots ? "Checking available times…" : "Only available slots are shown."}
                    </p>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => void updateBooking(
                        selectedBooking.id,
                        { date: rescheduleDate, start_time: rescheduleTime },
                        "Booking rescheduled successfully.",
                      )}
                      disabled={savingBookingId === selectedBooking.id || !rescheduleDate || !rescheduleTime}
                      className="w-full rounded-xl bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-blue transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save reschedule
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
