import { Resend } from "resend";
import { escapeEmailHtml, renderEmailLayout } from "./email-template";

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
  additional_information?: string | null;
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

function emailRow(label: string, value: string | number) {
  return `<tr><td style="padding:7px 12px 7px 0; color:#5b6573; vertical-align:top;"><strong>${label}:</strong></td><td style="padding:7px 0; color:#263238;">${escapeEmailHtml(value)}</td></tr>`;
}

function emailSection(title: string, rows: string) {
  return `<h2 style="margin:24px 0 10px; color:#003366; font-size:18px; line-height:1.4;">${title}</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; background-color:#f5f7fa; padding:12px;">${rows}</table>`;
}

export async function sendBookingEmails(booking: BookingEmailPayload) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  try {
    if (!resend) throw new Error("Missing RESEND_API_KEY");

    await resend.emails.send({
      from: "bookings@maggsymassagetherapy.com",
      to: process.env.JOSH_EMAIL || "josh@maggsymassagetherapy.com",
      subject: `New Booking: ${booking.client_name} - ${booking.treatment_name}`,
      html: renderEmailLayout({
        previewText: `New booking from ${booking.client_name}: ${booking.treatment_name}`,
        bodyHtml: `
          <h1 style="margin:0 0 18px; color:#003366; font-size:24px; line-height:1.3;">New Booking Received</h1>
          ${emailSection("Booking Details", `
            ${emailRow("Treatment", booking.treatment_name)}
            ${emailRow("Duration", `${booking.duration_mins} minutes`)}
            ${emailRow("Date", booking.date)}
            ${emailRow("Time", formatTime(booking.start_time))}
          `)}
          ${emailSection("Client Details", `
            ${emailRow("Name", booking.client_name)}
            ${emailRow("Date of Birth", booking.client_dob)}
            ${emailRow("Phone", booking.client_phone)}
            ${emailRow("Address", `${booking.client_address}, ${booking.client_postcode}`)}
          `)}
          ${emailSection("Additional Information", emailRow("Details", booking.additional_information || "Not provided"))}
          ${emailSection("Medical History", `
            ${emailRow("Conditions", booking.medical_conditions.join(", ") || "None reported")}
            ${booking.medical_notes ? emailRow("Notes", booking.medical_notes) : ""}
          `)}
          ${emailSection("Injury History", `
            ${emailRow("Recent Injury/Surgery", booking.injury_recent ? "Yes" : "No")}
            ${booking.injury_recent_notes ? emailRow("Details", booking.injury_recent_notes) : ""}
            ${emailRow("Previous Injuries", booking.injury_previous ? "Yes" : "No")}
            ${booking.injury_previous_notes ? emailRow("Details", booking.injury_previous_notes) : ""}
          `)}
          <p style="margin:24px 0 0; color:#5b6573; font-size:12px;">This is an automated booking notification from Maggy's Massage Therapy.</p>
        `,
      }),
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
      html: renderEmailLayout({
        previewText: `Your ${booking.treatment_name} appointment is confirmed.`,
        bodyHtml: `
          <h1 style="margin:0 0 18px; color:#003366; font-size:24px; line-height:1.3;">Booking Confirmed! ✅</h1>
          <p style="margin:0 0 16px;">Hi ${escapeEmailHtml(booking.client_name)},</p>
          <p style="margin:0 0 16px;">Your massage therapy booking has been confirmed. Here are your booking details:</p>
          ${emailSection("Your Appointment", `
            ${emailRow("Treatment", booking.treatment_name)}
            ${emailRow("Duration", `${booking.duration_mins} minutes`)}
            ${emailRow("Date", booking.date)}
            ${emailRow("Time", formatTime(booking.start_time))}
            ${emailRow("Location", `${booking.client_address}, ${booking.client_postcode}`)}
          `)}
          <h2 style="margin:24px 0 10px; color:#003366; font-size:18px; line-height:1.4;">What's Next?</h2>
          <ul style="margin:0; padding-left:22px; color:#374151;">
            <li style="margin-bottom:8px;">Our therapist will arrive at your location at the scheduled time</li>
            <li style="margin-bottom:8px;">If you need to reschedule or cancel, please contact us as soon as possible</li>
            <li>For any questions, feel free to reach out before your appointment</li>
          </ul>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px; border-collapse:collapse; background-color:#fff8e6; border-left:4px solid #d4a62d;">
            <tr><td style="padding:14px; color:#003366;"><strong>Questions?</strong> Contact us at <a href="mailto:info@maggsymassagetherapy.com" style="color:#003366;">info@maggsymassagetherapy.com</a> or call for support.</td></tr>
          </table>
          <p style="margin:24px 0 8px;">We look forward to seeing you!</p>
          <p style="margin:0; color:#003366; font-weight:bold;">Maggy's Massage Therapy Team</p>
          <p style="margin:24px 0 0; padding-top:15px; border-top:1px solid #e5e7eb; color:#7b8490; font-size:12px;">This is an automated confirmation email. Please do not reply directly to this email.</p>
        `,
      }),
    });
  } catch (emailError) {
    console.error("Failed to send confirmation email to client:", emailError);
  }
}
