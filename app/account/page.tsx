"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

interface CustomerSession {
  id: string;
  email: string;
  full_name: string | null;
  email_verified: boolean;
}

function AccountPageInner() {
  const params = useSearchParams();
  const resetToken = params.get("reset") || "";
  const verificationStatus = params.get("verified") || "";

  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [registering, setRegistering] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordMessage, setNewPasswordMessage] = useState("");

  const verificationMessage = useMemo(() => {
    if (verificationStatus === "success") return "Email verified — your account is now active.";
    if (verificationStatus === "expired") return "Verification link expired. Please register again to get a new one.";
    if (verificationStatus === "invalid") return "Verification link is invalid.";
    if (verificationStatus === "error") return "Unable to verify email right now.";
    return "";
  }, [verificationStatus]);

  const loadSession = async () => {
    const response = await fetch("/api/auth/me");
    const payload = await response.json();
    setCustomer(payload.customer || null);
  };

  useEffect(() => {
    void loadSession();
  }, []);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegistering(true);
    setRegisterMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registerEmail, full_name: registerName, password: registerPassword }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setRegisterMessage(payload?.error || "Unable to create account.");
        return;
      }

      setRegisterMessage("Account created. Check your email for a verification link.");
      setRegisterPassword("");
    } finally {
      setRegistering(false);
    }

  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setLoginError(payload?.error || "Unable to log in.");
        return;
      }
      setCustomer(payload.customer || null);
      setLoginPassword("");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCustomer(null);
  };

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestingReset(true);
    setResetMessage("");

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setResetMessage(payload?.error || "Unable to request reset.");
        return;
      }
      setResetMessage("If this email is registered, a password reset link has been sent.");
    } finally {
      setRequestingReset(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetToken) return;

    setResettingPassword(true);
    setNewPasswordMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setNewPasswordMessage(payload?.error || "Unable to reset password.");
        return;
      }
      setNewPasswordMessage("Password updated. You can now log in.");
      setNewPassword("");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h1 className="text-2xl font-bold text-brand-blue">Customer account</h1>
          <p className="text-sm text-gray-600">Create an account to book appointments and manage secure checkout.</p>
          {verificationMessage && <p className="text-sm text-brand-blue">{verificationMessage}</p>}

          {customer ? (
            <div className="space-y-3">
              <p className="text-sm">Signed in as <strong>{customer.email}</strong></p>
              <p className="text-xs text-gray-500">Email verified: {customer.email_verified ? "Yes" : "No"}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Log out
              </button>
              <p className="text-xs text-gray-500">Ready to book? <Link className="font-semibold text-brand-blue" href="/booking">Go to booking</Link></p>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleLogin}>
              <h2 className="text-lg font-semibold text-brand-blue">Log in</h2>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="Email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
              {loginError && <p className="text-sm text-red-600">{loginError}</p>}
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {loggingIn ? "Logging in..." : "Log in"}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <form className="rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3" onSubmit={handleRegister}>
            <h2 className="text-lg font-semibold text-brand-blue">Create account</h2>
            <input
              type="text"
              value={registerName}
              onChange={(event) => setRegisterName(event.target.value)}
              placeholder="Full name (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={registerEmail}
              onChange={(event) => setRegisterEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              placeholder="Password (min 8 characters)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
            {registerMessage && <p className="text-sm text-gray-700">{registerMessage}</p>}
            <button
              type="submit"
              disabled={registering}
              className="w-full rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-blue hover:opacity-90 disabled:opacity-60"
            >
              {registering ? "Creating..." : "Create account"}
            </button>
          </form>

          <form className="rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3" onSubmit={handleRequestReset}>
            <h2 className="text-lg font-semibold text-brand-blue">Forgot password</h2>
            <input
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
            {resetMessage && <p className="text-sm text-gray-700">{resetMessage}</p>}
            <button
              type="submit"
              disabled={requestingReset}
              className="w-full rounded-lg border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-60"
            >
              {requestingReset ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {resetToken && (
            <form className="rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3" onSubmit={handleResetPassword}>
              <h2 className="text-lg font-semibold text-brand-blue">Set new password</h2>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
              {newPasswordMessage && <p className="text-sm text-gray-700">{newPasswordMessage}</p>}
              <button
                type="submit"
                disabled={resettingPassword}
                className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {resettingPassword ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">Loading account...</div>}>
      <AccountPageInner />
    </Suspense>
  );
}
