"use client";

import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MedicalConditionsChecklist } from "@/components/medical-conditions-checklist";
import { hasNonNoneMedicalConditions, toggleMedicalCondition } from "@/lib/medical-conditions";
import { notifyCustomerSessionChanged } from "@/lib/customer-session-events";

interface CustomerSession {
  id: string;
  email: string;
  full_name: string | null;
  email_verified: boolean;
}

interface CustomerProfile {
  email: string;
  full_name: string;
  phone: string;
  address: string;
  postcode: string;
  date_of_birth: string;
  medical_conditions: string[];
  medical_notes: string;
  injury_recent: boolean;
  injury_recent_notes: string;
  injury_previous: boolean;
  injury_previous_notes: string;
  additional_information: string;
}

const EMPTY_PROFILE: CustomerProfile = {
  email: "",
  full_name: "",
  phone: "",
  address: "",
  postcode: "",
  date_of_birth: "",
  medical_conditions: [],
  medical_notes: "",
  injury_recent: false,
  injury_recent_notes: "",
  injury_previous: false,
  injury_previous_notes: "",
  additional_information: "",
};

function AccountInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [profile, setProfile] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [profileMessage, setProfileMessage] = useState("");
  const redirectPath = searchParams.get("redirect");
  const redirectTarget =
    redirectPath && redirectPath.startsWith("/") && !redirectPath.startsWith("//") ? redirectPath : null;
  const redirectReason = searchParams.get("reason");

  const loadProfile = useCallback(async () => {
    const response = await fetch("/api/account/profile");
    if (!response.ok) return;

    const payload = await response.json();
    const loadedProfile = {
      ...EMPTY_PROFILE,
      ...payload.profile,
      medical_conditions: Array.isArray(payload.profile?.medical_conditions) ? payload.profile.medical_conditions : [],
    } as CustomerProfile;

    setProfile(loadedProfile);
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me");
      const payload = await response.json();
      const sessionCustomer = (payload.customer ?? null) as CustomerSession | null;
      setCustomer(sessionCustomer);
      if (sessionCustomer) {
        setProfile((prev) => ({ ...prev, email: sessionCustomer.email }));
        await loadProfile();
      }
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

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

      setLoginPassword("");
      await loadSession();
      notifyCustomerSessionChanged();
      if (redirectTarget) {
        router.push(redirectTarget);
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCustomer(null);
    setProfile(EMPTY_PROFILE);
    notifyCustomerSessionChanged();
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          medical_conditions: profile.medical_conditions,
          medical_notes: hasNonNoneMedicalConditions(profile.medical_conditions) ? profile.medical_notes : "",
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setProfileMessage(payload?.error || "Unable to save profile.");
        return;
      }

      const updatedProfile = {
        ...EMPTY_PROFILE,
        ...payload.profile,
        medical_conditions: Array.isArray(payload.profile?.medical_conditions) ? payload.profile.medical_conditions : [],
      } as CustomerProfile;

      setProfile(updatedProfile);
      setProfileMessage("Profile saved.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleMedicalCondition = (condition: string) => {
    setProfile((prev) => ({
      ...prev,
      medical_conditions: toggleMedicalCondition(prev.medical_conditions, condition),
    }));
  };

  if (loading) {
    return <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">Loading account...</div>;
  }

  if (!customer) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h1 className="text-2xl font-bold text-brand-blue">Log in</h1>
          <p className="text-sm text-gray-600">Access your account to manage your profile and bookings.</p>
          {redirectReason === "booking" && (
            <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-sm text-brand-blue">
              Please log in before starting your booking.
            </div>
          )}
          {redirectReason === "session-expired" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Your booking session expired. Please log in again to continue your booking.
            </div>
          )}

          <form className="space-y-3" onSubmit={handleLogin}>
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              required
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
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

          <div className="space-y-2 text-sm">
            <p>
              Don&apos;t have an account?{" "}
              <Link
                className="font-semibold text-brand-blue"
                href={redirectTarget ? `/account/register?redirect=${encodeURIComponent(redirectTarget)}` : "/account/register"}
              >
                Sign up
              </Link>
            </p>
            <p>
              <Link
                className="font-semibold text-brand-blue"
                href={redirectTarget ? `/account/forgot-password?redirect=${encodeURIComponent(redirectTarget)}` : "/account/forgot-password"}
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-blue">My Account</h1>
            <p className="text-sm text-gray-600">Signed in as <strong>{customer.email}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/booking"
              className="rounded-lg border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5"
            >
              Back to booking
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSaveProfile}>
          <div>
            <label className="block text-sm font-semibold text-brand-blue mb-1">Full name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(event) => setProfile((prev) => ({ ...prev, full_name: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-blue mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Date of birth</label>
              <input
                type="date"
                value={profile.date_of_birth}
                onChange={(event) => setProfile((prev) => ({ ...prev, date_of_birth: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Postcode</label>
              <input
                type="text"
                value={profile.postcode}
                onChange={(event) => setProfile((prev) => ({ ...prev, postcode: event.target.value.toUpperCase() }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-blue mb-2">Medical history</label>
            <MedicalConditionsChecklist
              medicalConditions={profile.medical_conditions}
              medicalNotes={profile.medical_notes}
              onToggleCondition={handleToggleMedicalCondition}
              onMedicalNotesChange={(value) => setProfile((prev) => ({ ...prev, medical_notes: value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Recent injury in last 12 months?</label>
              <select
                value={profile.injury_recent ? "yes" : "no"}
                onChange={(event) => setProfile((prev) => ({ ...prev, injury_recent: event.target.value === "yes" }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              <textarea
                value={profile.injury_recent_notes}
                onChange={(event) => setProfile((prev) => ({ ...prev, injury_recent_notes: event.target.value }))}
                rows={3}
                placeholder="Recent injury notes"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Previous injuries still affecting you?</label>
              <select
                value={profile.injury_previous ? "yes" : "no"}
                onChange={(event) => setProfile((prev) => ({ ...prev, injury_previous: event.target.value === "yes" }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              <textarea
                value={profile.injury_previous_notes}
                onChange={(event) => setProfile((prev) => ({ ...prev, injury_previous_notes: event.target.value }))}
                rows={3}
                placeholder="Previous injury notes"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-blue mb-1">Additional information</label>
            <textarea
              value={profile.additional_information}
              onChange={(event) => setProfile((prev) => ({ ...prev, additional_information: event.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>

          {profileMessage && <p className="text-sm text-gray-700">{profileMessage}</p>}

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">Loading account...</div>}>
      <AccountInner />
    </Suspense>
  );
}
