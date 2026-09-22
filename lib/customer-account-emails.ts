import { Resend } from "resend";

function getBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

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
    html: `<p>Thanks for registering.</p><p>Please verify your email by clicking <a href=\"${verificationUrl}\">this link</a>.</p><p>This link expires in 24 hours.</p>`,
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
    html: `<p>We received a request to reset your password.</p><p>Use <a href=\"${resetUrl}\">this link</a> to set a new password.</p><p>This link expires in 1 hour.</p>`,
  });
}
