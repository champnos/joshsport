import { Resend } from "resend";

interface BookingEmailPayload {
  treatment_name: string;
  duration_mins: number;
  date: string;
  start_time: string;
  client_name: string;
  client_email?: string;
  client_dob: string;
  client_phone: string;
  client_address: string;
  client_postcode: string;
  emergency_name: string;
  emergency_relationship: string;
  emergency_phone: string;
  medical_conditions: string[];
  medical_notes: string;
  injury_recent: boolean;
  injury_recent_notes: string;
  injury_previous: boolean;
  injury_previous_notes: string;
}

function formatTime(timeValue: string) {
  const [h, m] = timeValue.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

export async function sendBookingEmails(booking: BookingEmailPayload) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  try {
    if (!resend) throw new Error("Missing RESEND_API_KEY");

    await resend.emails.send({
      from: "bookings@maggsymassagetherapy.com",
      to: process.env.JOSH_EMAIL || "josh@maggsymassagetherapy.com",
      subject: `New Booking: ${booking.client_name} - ${booking.treatment_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003366; margin-bottom: 20px;">New Booking Received</h2>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Booking Details</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Treatment:</strong> ${booking.treatment_name}</p>
            <p><strong>Duration:</strong> ${booking.duration_mins} minutes</p>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${formatTime(booking.start_time)}</p>
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Client Details</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Name:</strong> ${booking.client_name}</p>
            <p><strong>Date of Birth:</strong> ${booking.client_dob}</p>
            <p><strong>Phone:</strong> ${booking.client_phone}</p>
            <p><strong>Address:</strong> ${booking.client_address}, ${booking.client_postcode}</p>
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Emergency Contact</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Name:</strong> ${booking.emergency_name}</p>
            <p><strong>Relationship:</strong> ${booking.emergency_relationship}</p>
            <p><strong>Phone:</strong> ${booking.emergency_phone}</p>
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Medical History</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Conditions:</strong> ${booking.medical_conditions.join(", ") || "None reported"}</p>
            ${booking.medical_notes ? `<p><strong>Notes:</strong> ${booking.medical_notes}</p>` : ""}
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Injury History</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Recent Injury/Surgery:</strong> ${booking.injury_recent ? "Yes" : "No"}</p>
            ${booking.injury_recent_notes ? `<p><strong>Details:</strong> ${booking.injury_recent_notes}</p>` : ""}
            <p><strong>Previous Injuries:</strong> ${booking.injury_previous ? "Yes" : "No"}</p>
            ${booking.injury_previous_notes ? `<p><strong>Details:</strong> ${booking.injury_previous_notes}</p>` : ""}
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated booking notification from Maggy's Massage Therapy.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Failed to send email to Josh:", emailError);
  }

  if (!booking.client_email) return;

  try {
    if (!resend) throw new Error("Missing RESEND_API_KEY");

    await resend.emails.send({
      from: "bookings@maggsymassagetherapy.com",
      to: booking.client_email,
      subject: "Your Booking Confirmation - Maggy's Massage Therapy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003366; margin-bottom: 20px;">Booking Confirmed! ✅</h2>
          <p style="color: #666; margin-bottom: 20px;">Hi ${booking.client_name},</p>
          <p style="color: #666; margin-bottom: 20px;">Your massage therapy booking has been confirmed. Here are your booking details:</p>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Your Appointment</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Treatment:</strong> ${booking.treatment_name}</p>
            <p><strong>Duration:</strong> ${booking.duration_mins} minutes</p>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${formatTime(booking.start_time)}</p>
            <p><strong>Location:</strong> ${booking.client_address}, ${booking.client_postcode}</p>
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
  }
}
