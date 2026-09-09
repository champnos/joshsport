import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { ensureRollingWorkingDates, getBookableSlots, getBookingSettings } from "@/lib/working-dates";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const { data, error } = await supabase.from("bookings").select("*").order("date").order("start_time");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Unable to load bookings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalizedBooking = {
      treatment_id: body.treatment_id,
      treatment_name: typeof body.treatment_name === "string" ? body.treatment_name.trim() : "",
      duration_mins: body.duration_mins,
      date: typeof body.date === "string" ? body.date.trim() : "",
      start_time: typeof body.start_time === "string" ? body.start_time.trim() : "",
      client_name: typeof body.client_name === "string" ? body.client_name.trim() : "",
      client_dob: typeof body.client_dob === "string" ? body.client_dob.trim() : "",
      client_phone: typeof body.client_phone === "string" ? body.client_phone.trim() : "",
      client_address: typeof body.client_address === "string" ? body.client_address.trim() : "",
      client_postcode: typeof body.client_postcode === "string" ? body.client_postcode.trim() : "",
      client_email: typeof body.client_email === "string" ? body.client_email.trim() : "",
      emergency_name: typeof body.emergency_name === "string" ? body.emergency_name.trim() : "",
      emergency_relationship: typeof body.emergency_relationship === "string" ? body.emergency_relationship.trim() : "",
      emergency_phone: typeof body.emergency_phone === "string" ? body.emergency_phone.trim() : "",
      medical_conditions: Array.isArray(body.medical_conditions) ? body.medical_conditions : [],
      medical_notes: typeof body.medical_notes === "string" ? body.medical_notes.trim() : "",
      injury_recent: typeof body.injury_recent === "boolean" ? body.injury_recent : false,
      injury_recent_notes: typeof body.injury_recent_notes === "string" ? body.injury_recent_notes.trim() : "",
      injury_previous: typeof body.injury_previous === "boolean" ? body.injury_previous : false,
      injury_previous_notes: typeof body.injury_previous_notes === "string" ? body.injury_previous_notes.trim() : "",
    };
    const {
      treatment_id,
      duration_mins,
      date,
      start_time,
      client_name,
      client_dob,
      client_phone,
      client_address,
      client_postcode,
      client_email,
    } = normalizedBooking;

    const dobMatch = client_dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let isValidDob = false;
    if (dobMatch) {
      const year = Number(dobMatch[1]);
      const month = Number(dobMatch[2]);
      const day = Number(dobMatch[3]);
      const parsedDob = new Date(Date.UTC(year, month - 1, day));
      isValidDob =
        parsedDob.getUTCFullYear() === year &&
        parsedDob.getUTCMonth() === month - 1 &&
        parsedDob.getUTCDate() === day;
    }
    const hasLeadingPlus = client_phone.startsWith("+");
    const normalizedPhone = `${hasLeadingPlus ? "+" : ""}${client_phone.replace(/\D/g, "")}`;
    const isValidPhone = /^\+?\d{7,15}$/.test(normalizedPhone);

    if (
      !treatment_id ||
      !date ||
      !start_time ||
      !duration_mins ||
      !client_name ||
      !client_dob ||
      !client_phone ||
      !client_address ||
      !client_postcode
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (!isValidDob) {
      return NextResponse.json({ error: "Date of birth must be a valid date in YYYY-MM-DD format." }, { status: 400 });
    }

    if (!isValidPhone) {
      return NextResponse.json(
        { error: "Phone number must contain 7-15 digits (optional leading +; spaces, hyphens, and parentheses allowed)." },
        { status: 400 }
      );
    }

    await ensureRollingWorkingDates();

    const { data: workingDateData, error: workingDateError } = await supabase
      .from("working_dates")
      .select("date, available, start_time, end_time, blocked_slots")
      .eq("date", date)
      .single();

    if (workingDateError && workingDateError.code !== "PGRST116") throw workingDateError;
    if (!workingDateData) {
      return NextResponse.json({ error: "Selected date is not available for bookings." }, { status: 409 });
    }

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, duration_mins")
      .eq("date", date)
      .neq("status", "cancelled");

    const settings = await getBookingSettings();
    const available = getBookableSlots(date, duration_mins, workingDateData, existingBookings ?? [], settings);
    if (!available.includes(start_time)) {
      return NextResponse.json({ error: "Selected time is no longer available." }, { status: 409 });
    }

    const insertPayload = { ...normalizedBooking, status: "pending" };

    const { data, error } = await supabase.from("bookings").insert([insertPayload]).select().single();
    if (error) throw error;

    // Format time for email
    const formatTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const period = h >= 12 ? "pm" : "am";
      const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${hour}:${m.toString().padStart(2, "0")}${period}`;
    };

    // Send email to Josh with booking details
    try {
      if (!resend) throw new Error("Missing RESEND_API_KEY");

      await resend.emails.send({
        from: "bookings@maggsymassagetherapy.com",
        to: process.env.JOSH_EMAIL || "josh@maggsymassagetherapy.com",
        subject: `New Booking: ${normalizedBooking.client_name} - ${normalizedBooking.treatment_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #003366; margin-bottom: 20px;">New Booking Received</h2>
            
            <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Booking Details</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Treatment:</strong> ${normalizedBooking.treatment_name}</p>
              <p><strong>Duration:</strong> ${normalizedBooking.duration_mins} minutes</p>
              <p><strong>Date:</strong> ${normalizedBooking.date}</p>
              <p><strong>Time:</strong> ${formatTime(normalizedBooking.start_time)}</p>
            </div>

            <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Client Details</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Name:</strong> ${normalizedBooking.client_name}</p>
              <p><strong>Date of Birth:</strong> ${normalizedBooking.client_dob}</p>
              <p><strong>Phone:</strong> ${normalizedBooking.client_phone}</p>
              <p><strong>Address:</strong> ${normalizedBooking.client_address}, ${normalizedBooking.client_postcode}</p>
            </div>

            <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Emergency Contact</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Name:</strong> ${normalizedBooking.emergency_name}</p>
              <p><strong>Relationship:</strong> ${normalizedBooking.emergency_relationship}</p>
              <p><strong>Phone:</strong> ${normalizedBooking.emergency_phone}</p>
            </div>

            <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Medical History</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Conditions:</strong> ${normalizedBooking.medical_conditions.join(", ") || "None reported"}</p>
              ${normalizedBooking.medical_notes ? `<p><strong>Notes:</strong> ${normalizedBooking.medical_notes}</p>` : ""}
            </div>

            <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Injury History</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Recent Injury/Surgery:</strong> ${normalizedBooking.injury_recent ? "Yes" : "No"}</p>
              ${normalizedBooking.injury_recent_notes ? `<p><strong>Details:</strong> ${normalizedBooking.injury_recent_notes}</p>` : ""}
              <p><strong>Previous Injuries:</strong> ${normalizedBooking.injury_previous ? "Yes" : "No"}</p>
              ${normalizedBooking.injury_previous_notes ? `<p><strong>Details:</strong> ${normalizedBooking.injury_previous_notes}</p>` : ""}
            </div>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated booking notification from Maggy's Massage Therapy.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send email to Josh:", emailError);
      // Don't fail the booking if email fails
    }

    // Send confirmation email to client
    try {
      if (!resend) throw new Error("Missing RESEND_API_KEY");

      await resend.emails.send({
        from: "bookings@maggsymassagetherapy.com",
        to: client_email,
        subject: "Your Booking Confirmation - Maggy's Massage Therapy",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #003366; margin-bottom: 20px;">Booking Confirmed! ✅</h2>
            <p style="color: #666; margin-bottom: 20px;">Hi ${normalizedBooking.client_name},</p>
            <p style="color: #666; margin-bottom: 20px;">Your massage therapy booking has been confirmed. Here are your booking details:</p>
            
            <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Your Appointment</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Treatment:</strong> ${normalizedBooking.treatment_name}</p>
              <p><strong>Duration:</strong> ${normalizedBooking.duration_mins} minutes</p>
              <p><strong>Date:</strong> ${normalizedBooking.date}</p>
              <p><strong>Time:</strong> ${formatTime(normalizedBooking.start_time)}</p>
              <p><strong>Location:</strong> ${normalizedBooking.client_address}, ${normalizedBooking.client_postcode}</p>
            </div>

            <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">What's Next?</h3>
            <ul style="color: #666;">
              <li>Our therapist will arrive at your location at the scheduled time</li>
              <li>If you need to reschedule or cancel, please contact us as soon as possible</li>
              <li>For any questions, feel free to reach out before your appointment</li>
            </ul>

            <div style="background-color: #e8f4f8; border-left: 4px solid #003366; padding: 15px; margin: 20px 0;">
              <p style="color: #003366; margin: 0;"><strong>Questions?</strong> Contact us at info@maggsymassagetherapy.com or call for support.</p>
            </div>

            <p style="color: #666; margin-top: 30px;">We look forward to seeing you!</p>
            <p style="color: #666; font-weight: bold;">Maggy's Massage Therapy Team</p>

            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">This is an automated confirmation email. Please do not reply directly to this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email to client:", emailError);
      // Don't fail the booking if email fails
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
