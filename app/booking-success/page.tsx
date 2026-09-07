import { Suspense } from "react";
import Link from "next/link";

function BookingSuccessInner() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand-blue py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold text-white">Booking Confirmed! ✅</h1>
          <p className="mt-2 text-brand-gold">Your massage session has been booked</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center mb-8">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Payment Successful</h2>
          <p className="text-green-700 mb-4">Your treatment booking and payment have been confirmed.</p>
          <p className="text-sm text-green-600">A confirmation email will be sent to you shortly with all the details.</p>
        </div>

        <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-bold text-brand-blue mb-4">What&apos;s next?</h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-brand-gold font-bold">✓</span>
              <span>Check your email for booking confirmation and therapist details</span>
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
