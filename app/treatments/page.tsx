import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTreatments } from "@/lib/data";
import { formatCurrency, getTreatmentPrice } from "@/lib/utils";

export default function TreatmentsPage() {
  const treatments = getTreatments().filter((treatment) => treatment.active);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">Treatments</p>
        <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Sports massage options built around your goals.</h1>
        <p className="mt-6 text-lg text-gray-400">
          Choose a session length and focus that matches your training phase, recovery needs or day-to-day discomfort.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {treatments.map((treatment) => (
          <Card key={treatment.id} className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>{treatment.name}</CardTitle>
              <CardDescription className="text-base leading-7 text-gray-400">{treatment.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-6">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">Available durations</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {treatment.durations.map((duration) => (
                    <div key={duration} className="rounded-2xl border border-gray-700 bg-gray-950/80 px-4 py-3 text-sm text-gray-200">
                      <span className="font-medium">{duration} mins</span>
                      <span className="mx-2 text-gray-500">•</span>
                      <span>{formatCurrency(getTreatmentPrice(treatment, duration))}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/booking">
                <Button>Book now</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
