"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setResetting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error || "Unable to reset password.");
        return;
      }

      setPassword("");
      setMessage("Password updated. You can now log in.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-brand-blue">Set new password</h1>

        {!token ? (
          <p className="text-sm text-red-600">Reset token is missing. Please use the link from your email.</p>
        ) : (
          <form className="space-y-3" onSubmit={handleResetPassword}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              required
            />
            {message && <p className="text-sm text-gray-700">{message}</p>}
            <button
              type="submit"
              disabled={resetting}
              className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {resetting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        <Link className="font-semibold text-brand-blue text-sm" href="/account">
          Back to login
        </Link>
      </div>
    </div>
  );
}
