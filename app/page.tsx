import Link from "next/link";
import { Activity, ShieldCheck, TimerReset, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTreatments } from "@/lib/data";
import { formatCurrency, getTreatmentPrice } from "@/lib/utils";

const benefits = [
  {
    title: "Relief from muscle tension",
    description: "Release stubborn tightness, knots and overload from sport, training blocks or desk-based posture.",
    icon: Waves,
  },
  {
    title: "Enhanced performance",
    description: "Improve movement quality, tissue readiness and confidence before key sessions and events.",
    icon: Activity,
  },
  {
    title: "Faster recovery",
    description: "Reduce soreness and help your body rebound quicker after races, matches and demanding training weeks.",
    icon: TimerReset,
  },
  {
    title: "Injury prevention",
    description: "Spot restrictions early and keep your training consistent with proactive body maintenance.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  const treatments = getTreatments().filter((treatment) => treatment.active).slice(0, 4);

  return (
    <div>
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(3,7,18,0.92),_rgba(3,7,18,0.72)),radial-gradient(circle_at_top_right,_rgba(22,163,74,0.35),_transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-400">Bath & Bristol</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">Josh Maggs</h1>
          <p className="mt-4 max-w-2xl text-xl text-gray-300 sm:text-2xl">Sports Massage Therapy | Bath & Bristol</p>
          <p className="mt-6 max-w-2xl text-base text-gray-400 sm:text-lg">
            Strategic sports massage for performance, injury prevention and recovery—built around the demands of active bodies.
          </p>
          <div className="mt-10">
            <Link href="/booking">
              <Button size="lg">Book Your Session</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-gray-700 bg-gray-900/60 text-center text-sm text-gray-500">
          {/* Placeholder for professional treatment or athlete portrait photography */}
          Professional photo placeholder
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">About Josh</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Built for athletes, grounded in sports science.</h2>
          <div className="mt-6 space-y-4 text-gray-300">
            <p>
              Josh Maggs is a Bath University Sports Science graduate and Level 3 qualified sports massage therapist who understands the real demands of training, competing and recovering well.
            </p>
            <p>
              As a competitive sprinter, Josh brings first-hand experience of performance preparation, post-event recovery and staying resilient through hard training cycles.
            </p>
            <p>
              He is currently progressing toward his Level 4 qualification, continuing to deepen his clinical knowledge while delivering practical, athlete-focused care.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-900/70 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">Why Sports Massage?</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">More than relaxation—this is body maintenance for active living.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card key={benefit.title} className="h-full bg-gray-950/70">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-7 text-gray-400">{benefit.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">Featured Treatments</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Targeted sessions for training, competition and recovery.</h2>
          </div>
          <Link href="/treatments" className="text-sm font-medium text-green-400 hover:text-green-300">
            View all treatments →
          </Link>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {treatments.map((treatment) => (
            <Card key={treatment.id} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{treatment.name}</CardTitle>
                <CardDescription className="leading-7 text-gray-400">{treatment.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-2 text-sm text-gray-300">
                  {treatment.durations.map((duration) => (
                    <span key={duration} className="rounded-full border border-gray-700 px-3 py-1">
                      {duration} mins · {formatCurrency(getTreatmentPrice(treatment, duration))}
                    </span>
                  ))}
                </div>
                <Link href="/booking">
                  <Button className="w-full">Book treatment</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gray-900/70 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">Photo Gallery</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">A professional, athletic treatment environment.</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-gray-700 bg-gray-950/70 text-sm text-gray-500"
              >
                Gallery image placeholder {index + 1}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
