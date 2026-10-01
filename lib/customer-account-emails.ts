import { Resend } from "resend";
import { escapeEmailHtml, renderEmailLayout } from "./email-template";
import { getBaseUrl } from "./site-url";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export async function sendCustomerVerificationEmail(email: string, token: string) {
  const resend = getResendClient();
  const verificationUrl = `${getBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  if (!resend) {
    console.info("Customer verification email skipped (missing RESEND_API_KEY):", verificationUrl);
    return;
  }

  await resend.emails.send({
    from: "bookings@maggsymassagetherapy.com",
    to: email,
    subject: "Verify your MMT account",
    html: renderEmailLayout({
      previewText: "Verify your MMT account email address.",
      bodyHtml: `<h1 style="margin:0 0 20px; color:#003366; font-size:24px; line-height:1.3;">Verify your MMT account</h1><p>Thanks for registering.</p><p>Please verify your email by clicking <a href="${escapeEmailHtml(verificationUrl)}" style="color:#003366;">this link</a>.</p><p>This link expires in 24 hours.</p>`,
    }),
  });
}

export async function sendCustomerPasswordResetEmail(email: string, token: string) {
  const resend = getResendClient();
  const resetUrl = `${getBaseUrl()}/account/reset-password?token=${encodeURIComponent(token)}`;

  if (!resend) {
    console.info("Customer password reset email skipped (missing RESEND_API_KEY):", resetUrl);
    return;
  }

  await resend.emails.send({
    from: "bookings@maggsymassagetherapy.com",
    to: email,
    subject: "Reset your MMT account password",
    html: renderEmailLayout({
      previewText: "Reset your MMT account password.",
      bodyHtml: `<h1 style="margin:0 0 20px; color:#003366; font-size:24px; line-height:1.3;">Reset your MMT account password</h1><p>We received a request to reset your password.</p><p>Use <a href="${escapeEmailHtml(resetUrl)}" style="color:#003366;">this link</a> to set a new password.</p><p>This link expires in 1 hour.</p>`,
    }),
  });
}
