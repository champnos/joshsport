import Link from "next/link";
import { getTermsAndConditions } from "@/lib/terms-store";

export default async function TermsPage() {
  const terms = await getTermsAndConditions();

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-brand-blue px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{terms.title}</h1>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="rounded-2xl border border-brand-blue/10 bg-white p-6 shadow-sm sm:p-8">
            <div className="whitespace-pre-wrap text-gray-700 leading-7">{terms.content}</div>
          </div>

          <div className="rounded-2xl bg-brand-blue p-6 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h2 className="text-xl font-bold">Ready to book?</h2>
              <p className="mt-2 text-white/80">Review the terms here any time, then continue to your treatment booking when you&apos;re ready.</p>
            </div>
            <Link
              href="/booking"
              className="mt-4 inline-block rounded-lg bg-brand-gold px-5 py-3 text-sm font-bold text-brand-blue hover:opacity-90 sm:mt-0"
            >
              Book Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
