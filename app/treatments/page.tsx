"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DurationOption {
  mins: number;
  price: number;
}

interface TreatmentOption {
  id: string;
  name: string;
  description: string;
  durations: DurationOption[];
  image_url?: string;
  active: boolean;
}

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<TreatmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const res = await fetch("/api/treatments");
        if (res.ok) {
          const data = await res.json();
          // Only show active treatments
          setTreatments(data.filter((t: TreatmentOption) => t.active));
        }
      } catch {
        console.error("Failed to load treatments");
      } finally {
        setLoading(false);
      }
    };
    loadTreatments();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-brand-blue py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">Treatments</h1>
          <p className="mt-2 text-xl text-brand-gold font-medium">Sports massage options built around your goals</p>
          <p className="mt-4 text-white/70 max-w-2xl">
            Choose a session length and focus that matches your training phase, recovery needs or day-to-day discomfort
          </p>
        </div>
      </div>

      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading && <p className="text-gray-500">Loading treatments...</p>}
          {!loading && treatments.length === 0 && <p className="text-gray-500">No treatments available.</p>}
          {!loading && treatments.length > 0 && (
            <div className="grid gap-8 lg:grid-cols-2">
              {treatments.map((t) => (
                <div key={t.id} className="border-t border-r border-b border-brand-blue/10 border-l-4 border-l-brand-gold rounded-2xl overflow-hidden flex flex-col shadow-sm">
                  {t.image_url && (
                    <div className="w-full h-48 bg-gray-200 overflow-hidden">
                      <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-8 flex flex-col flex-1">
                    <h2 className="text-2xl font-bold text-brand-blue">{t.name}</h2>
                    <p className="mt-3 text-gray-600 leading-7 flex-1">{t.description}</p>
                    <div className="mt-6">
                      <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold mb-3">Pricing</p>
                      <div className="flex flex-wrap gap-3">
                        {t.durations.map((d) => (
                          <div key={d.mins} className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl px-4 py-3 text-sm">
                            <span className="font-bold text-brand-blue">{d.mins} mins</span>
                            <span className="mx-2 text-gray-300">·</span>
                            <span className="text-brand-blue font-semibold">£{d.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={`/booking?treatment=${t.id}`}
                      className="mt-6 inline-block text-center bg-brand-gold text-brand-blue font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Book This Treatment
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
