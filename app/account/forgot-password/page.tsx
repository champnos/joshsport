"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [requesting, setRequesting] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequesting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error || "Unable to request reset.");
        return;
      }

      setMessage("If this email is registered, a password reset link has been sent.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-brand-blue">Forgot password</h1>
        <p className="text-sm text-gray-600">Enter your account email and we&apos;ll send a reset link.</p>

        <form className="space-y-3" onSubmit={handleRequestReset}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            required
          />
          {message && <p className="text-sm text-gray-700">{message}</p>}
          <button
            type="submit"
            disabled={requesting}
            className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {requesting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="text-sm">
          Remembered your password?{" "}
          <Link className="font-semibold text-brand-blue" href="/account">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
