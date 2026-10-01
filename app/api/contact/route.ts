import { NextResponse } from "next/server";
import { Resend } from "resend";
import { escapeEmailHtml, renderEmailLayout } from "@/lib/email-template";

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

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email via Resend
    await resend.emails.send({
      from: "contact@maggsymassagetherapy.com",
      to: "contact@maggsymassagetherapy.com",
      reply_to: trimmedEmail,
      subject: `New Contact Form Submission from ${trimmedName}`,
      html: renderEmailLayout({
        previewText: `New contact form submission from ${trimmedName}`,
        bodyHtml: `
          <h1 style="margin:0 0 20px; color:#003366; font-size:24px; line-height:1.3;">New Contact Form Submission</h1>
          <p><strong>Name:</strong> ${escapeEmailHtml(trimmedName)}</p>
          <p><strong>Email:</strong> ${escapeEmailHtml(trimmedEmail)}</p>
          ${trimmedPhone ? `<p><strong>Phone:</strong> ${escapeEmailHtml(trimmedPhone)}</p>` : ""}
          <p><strong>Message:</strong></p>
          <p>${escapeEmailHtml(trimmedMessage).replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  }
}
