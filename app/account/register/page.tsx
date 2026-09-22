"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");

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

      router.push(`/account/register/success?email=${encodeURIComponent(registerEmail)}`);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-brand-blue">Create account</h1>
        <p className="text-sm text-gray-600">Create your account to book and manage your details.</p>

        <form className="space-y-3" onSubmit={handleRegister}>
          <input
            type="text"
            value={registerName}
            onChange={(event) => setRegisterName(event.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <input
            type="email"
            value={registerEmail}
            onChange={(event) => setRegisterEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            required
          />
          <input
            type="password"
            value={registerPassword}
            onChange={(event) => setRegisterPassword(event.target.value)}
            placeholder="Password (min 8 characters)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            required
          />
          {registerMessage && <p className="text-sm text-red-600">{registerMessage}</p>}
          <button
            type="submit"
            disabled={registering}
            className="w-full rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-blue hover:opacity-90 disabled:opacity-60"
          >
            {registering ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-sm">
          Already have an account?{" "}
          <Link className="font-semibold text-brand-blue" href="/account">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
