import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, email, phone, message } = await request.json();
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
    const trimmedMessage = typeof message === "string" ? message.trim() : "";

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
    }
    // TODO: Replace with email sending (e.g. Resend, SendGrid, or Nodemailer)
    // e.g. send to hello@maggsymassagetherapy.com
    console.log("Contact form submission received", {
      hasPhone: Boolean(trimmedPhone),
      messageLength: trimmedMessage.length,
      submittedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  }
}
