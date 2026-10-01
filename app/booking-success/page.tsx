"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface BookingConfirmationSummary {
  voucher_code: string | null;
  base_amount_pence: number | null;
  discount_amount_pence: number | null;
  final_amount_pence: number | null;
  is_guest_booking?: boolean;
  client_name?: string;
  client_email?: string;
}

function CreateAccountPrompt({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [createdForEmail, setCreatedForEmail] = useState("");

  if (dismissed) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setAccountExists(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, full_name: fullName, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setAccountExists(response.status === 409);
        setError(payload?.error || "Unable to create account.");
        return;
      }

      setPassword("");
      setCreatedForEmail(email.trim());
    } catch {
      setError("Unable to create account right now. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  if (createdForEmail) {
    return (
      <div className="bg-white border border-green-200 rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-bold text-brand-blue mb-2">Almost done — check your email</h3>
        <p className="text-sm text-gray-700">
          We sent a verification link to <strong>{createdForEmail}</strong>. Once you verify, this booking and your details
          will be saved to your account so you can book faster next time. Check your junk or spam folder if it doesn&apos;t arrive.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-brand-blue/15 rounded-2xl p-6 mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-brand-blue">Create an account (optional)</h3>
          <p className="mt-1 text-sm text-gray-600">
            Create an account to manage your bookings and book faster next time. Your booking is already confirmed either way.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-sm font-medium text-gray-500 hover:text-brand-blue"
        >
          No thanks
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="create-account-name" className="block text-sm font-semibold text-brand-blue mb-1">Full name</label>
          <input
            id="create-account-name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div>
          <label htmlFor="create-account-email" className="block text-sm font-semibold text-brand-blue mb-1">Email</label>
          <input
            id="create-account-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            required
          />
        </div>
        <div>
          <label htmlFor="create-account-password" className="block text-sm font-semibold text-brand-blue mb-1">Password</label>
          <input
            id="create-account-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            required
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}{" "}
            {accountExists && (
              <Link href="/account" className="font-semibold underline">
                Log in instead
              </Link>
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-blue hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}

function BookingSuccessInner() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id") || "";
  const checkoutTokenFromUrl = searchParams.get("token") || "";
  const confirmationToken = searchParams.get("confirmation_token") || "";
  const [checkoutToken, setCheckoutToken] = useState(checkoutTokenFromUrl);
  const [checkoutTokenLoaded, setCheckoutTokenLoaded] = useState(Boolean(checkoutTokenFromUrl));
  const [summary, setSummary] = useState<BookingConfirmationSummary | null>(null);
  const [confirmationState, setConfirmationState] = useState<"confirming" | "confirmed" | "failed">("confirming");
  const [confirmationError, setConfirmationError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setIsLoggedIn(Boolean(payload?.customer));
      })
      .catch(() => {
        if (!cancelled) setIsLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bookingId) {
      setCheckoutTokenLoaded(true);
      return;
    }

    if (checkoutTokenFromUrl) {
      setCheckoutTokenLoaded(true);
      return;
    }

    try {
      const storageKey = `bookingCheckoutToken:${bookingId}`;
      const storedCheckoutToken = window.sessionStorage.getItem(storageKey) || "";
      if (storedCheckoutToken) {
        setCheckoutToken(storedCheckoutToken);
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      setCheckoutToken("");
    } finally {
      setCheckoutTokenLoaded(true);
    }
  }, [bookingId, checkoutTokenFromUrl]);

  useEffect(() => {
    if (!bookingId || !checkoutTokenLoaded) return;
    let cancelled = false;
    let transientRetryCount = 0;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    const maxTransientRetries = 3;

    const queueRetry = () => {
      if (cancelled || transientRetryCount >= maxTransientRetries) {
        if (!cancelled) {
          setConfirmationState("failed");
          setConfirmationError("We couldn't confirm your booking automatically. Please contact support with your booking reference.");
        }
        return;
      }

      transientRetryCount += 1;
      setConfirmationState("confirming");
      setConfirmationError("Still waiting for payment confirmation. We’ll keep trying for a moment.");
      retryTimeout = setTimeout(() => {
        if (!cancelled) {
          void loadSummary();
        }
      }, 3000);
    };

    const loadSummary = async () => {
      if (!checkoutToken && !confirmationToken) {
        if (!cancelled) {
          setConfirmationState("failed");
          setConfirmationError("We couldn't verify your booking automatically. Please contact support with your booking reference.");
        }
        return;
      }

      if (!cancelled) {
        setConfirmationState("confirming");
        setConfirmationError("");
      }

      try {
        const requestBody: { checkoutToken?: string; token?: string } = {};
        if (checkoutToken) requestBody.checkoutToken = checkoutToken;
        if (confirmationToken) requestBody.token = confirmationToken;

        const response = await fetch(`/api/bookings/confirmation/${bookingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          await response.json().catch(() => ({}));
          const permanentFailure = response.status === 403 || response.status === 404 || response.status === 409;
          if (!cancelled) {
            setSummary(null);
            if (permanentFailure) {
              setConfirmationState("failed");
              setConfirmationError("We couldn't confirm your booking automatically. Please contact support with your booking reference.");
            } else {
              queueRetry();
            }
          }
          return;
        }

        const payload = (await response.json()) as BookingConfirmationSummary;
        if (!cancelled) {
          setSummary(payload);
          setConfirmationState("confirmed");
          setConfirmationError("");
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
          queueRetry();
        }
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [bookingId, checkoutToken, checkoutTokenLoaded, confirmationToken]);

  const formatPrice = (value: number) => (value / 100).toFixed(2);
  const hasDiscountDetails = Boolean(
    summary?.voucher_code &&
    typeof summary.base_amount_pence === "number" &&
    typeof summary.discount_amount_pence === "number" &&
    typeof summary.final_amount_pence === "number" &&
    summary.discount_amount_pence > 0,
  );
  const baseAmount = typeof summary?.base_amount_pence === "number" ? summary.base_amount_pence : 0;
  const discountAmount = typeof summary?.discount_amount_pence === "number" ? summary.discount_amount_pence : 0;
  const finalAmount = typeof summary?.final_amount_pence === "number" ? summary.final_amount_pence : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand-blue py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold text-white">Payment Received ✅</h1>
          <p className="mt-2 text-brand-gold">We&apos;re confirming your massage session now</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center mb-8">
          {confirmationState === "confirmed" ? (
            <>
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed</h2>
              <p className="text-green-700 mb-4">Your payment has been received and your booking is now confirmed.</p>
              <p className="text-sm text-green-600">Your confirmation email is on its way.</p>
            </>
          ) : confirmationState === "failed" ? (
            <>
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-red-800 mb-2">We&apos;re still confirming your booking</h2>
              <p className="text-red-700 mb-2" role="alert" aria-live="assertive">
                {confirmationError}
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Finalising your booking</h2>
              <p className="text-green-700 mb-4">Your payment has been received. Please wait while we confirm your booking.</p>
              {confirmationError && <p className="text-sm text-green-700">{confirmationError}</p>}
            </>
          )}
        </div>

        {confirmationState === "confirmed" && (
          <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-brand-blue mb-4">What&apos;s next?</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-brand-gold font-bold">✓</span>
                <span>Check your email shortly for the booking confirmation and therapist details</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-gold font-bold">✓</span>
                <span>Make sure your home/selected location is ready for the therapist</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-gold font-bold">✓</span>
                <span>Have any special requests? Contact us before your appointment</span>
              </li>
            </ul>
          </div>
        )}

        {confirmationState === "confirmed" && summary?.is_guest_booking && isLoggedIn === false && (
          <CreateAccountPrompt defaultName={summary.client_name ?? ""} defaultEmail={summary.client_email ?? ""} />
        )}

        {confirmationState === "confirmed" && hasDiscountDetails && summary && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-brand-blue mb-4">Voucher Applied</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Original price</span>
                <span>£{formatPrice(baseAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Voucher ({summary.voucher_code})</span>
                <span>-£{formatPrice(discountAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-brand-blue border-t border-gray-100 pt-2">
                <span>Final price paid</span>
                <span>£{formatPrice(finalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="bg-brand-blue text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
          <Link
            href="/booking"
            className="border-2 border-brand-blue text-brand-blue font-bold px-8 py-3 rounded-lg hover:bg-brand-blue/5 transition-colors"
          >
            Book Another Session
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-brand-blue">Loading...</div>}>
      <BookingSuccessInner />
    </Suspense>
  );
}
