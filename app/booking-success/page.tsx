"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface BookingConfirmationSummary {
  voucher_code: string | null;
  base_amount_pence: number | null;
  discount_amount_pence: number | null;
  final_amount_pence: number | null;
}

function BookingSuccessInner() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id") || "";
  const checkoutToken = searchParams.get("token") || "";
  const confirmationToken = searchParams.get("confirmation_token") || "";
  const [summary, setSummary] = useState<BookingConfirmationSummary | null>(null);

  useEffect(() => {
    if (!bookingId || (!checkoutToken && !confirmationToken)) return;
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const response = checkoutToken
          ? await fetch(`/api/bookings/confirmation/${bookingId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checkoutToken }),
            })
          : await fetch(`/api/bookings/confirmation/${bookingId}?token=${encodeURIComponent(confirmationToken)}`);
        if (!response.ok) return;
        const payload = (await response.json()) as BookingConfirmationSummary;
        if (!cancelled) setSummary(payload);
      } catch {
        if (!cancelled) setSummary(null);
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [bookingId, checkoutToken, confirmationToken]);

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
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Payment Successful</h2>
          <p className="text-green-700 mb-4">Your payment has been received and we&apos;re finalising your booking.</p>
          <p className="text-sm text-green-600">Your confirmation email will be sent as soon as Stripe finishes confirming the payment.</p>
        </div>

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

        {hasDiscountDetails && summary && (
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
