import Link from "next/link";
import { Activity, ShieldCheck, TimerReset, Waves } from "lucide-react";

const benefits = [
  {
    title: "Relief from muscle tension",
    description: "Release stubborn tightness, knots and adhesions from sport, training blocks and every day life.",
    icon: Waves,
  },
  {
    title: "Enhanced Performance",
    description: "Improve movement quality, tissue readiness and confidence to perform at the highest level.",
    icon: Activity,
  },
  {
    title: "Faster Recovery",
    description: "Reduce muscle soreness and help your body recover quickly after intense training, matches and competitions.",
    icon: TimerReset,
  },
  {
    title: "Injury Prevention",
    description: "Identify restrictions and imbalances early to keep your training consistent with proactive body maintenance.",
    icon: ShieldCheck,
  },
];

const featuredTreatments = [
  {
    id: "sports-massage",
    name: "Sports Massage",
    description: "Designed to aid performance, prevent injury and support recovery through movement and deep tissue techniques.",
    pricing: [{ mins: 30, price: 25 }, { mins: 45, price: 35 }, { mins: 60, price: 45 }],
  },
  {
    id: "full-body-reset",
    name: "Full Body Reset",
    description: "A full-length sports massage that targets all muscle groups for total body recovery and reset.",
    pricing: [{ mins: 90, price: 65 }],
  },
  {
    id: "pre-event",
    name: "Pre-Event Treatment",
    description: "Activating and stimulating massage to prime your muscles for competition.",
    pricing: [{ mins: 30, price: 25 }],
  },
  {
    id: "post-event",
    name: "Post-Event Recovery",
    description: "Gentle yet effective techniques to flush out waste products and speed up recovery.",
    pricing: [{ mins: 30, price: 25 }],
  },
];

export default function Home() {
  return (
    <div>
      <section
        className="relative flex min-h-[85vh] items-center px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: "radial-gradient(ellipse at top right, #0a3060 0%, #012255 60%)" }}
      >
        {/* subtle dot-grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="mx-auto max-w-7xl py-24 w-full relative z-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-blue bg-brand-gold px-3 py-1 rounded-full mb-6">
            Bristol &amp; Bath
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">JOSH MAGGS</h1>
          <div className="mt-4 w-16 h-1 bg-brand-gold rounded-full" />
          <p className="mt-6 text-xl font-medium text-brand-gold">Mobile Sports Massage Therapy</p>
          <p className="mt-4 max-w-2xl text-lg text-white/75">
            Professional sports massage, brought to you, at the comfort of your home.
          </p>
          <div className="mt-10">
            <Link
              href="/booking"
              className="inline-block bg-brand-gold text-brand-blue font-bold px-8 py-4 rounded-lg text-lg hover:opacity-90 transition-opacity"
            >
              Book Now
            </Link>
          </div>
        </div>
        {/* wave divider */}
        <div className="absolute bottom-0 left-0 right-0 leading-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="white" />
          </svg>
        </div>
      </section>

      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-2 items-center">
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border-4 border-brand-gold/40 bg-gray-50 text-center text-gray-400 text-sm shadow-sm">
            [ Photo of Josh ]
          </div>
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-blue bg-brand-gold px-3 py-1 rounded-full">
              About Maggsy
            </span>
            <h2 className="mt-4 text-3xl font-bold text-brand-blue sm:text-4xl">Built for athletes, grounded in sports science</h2>
            <div className="mt-6 space-y-4 text-gray-700 leading-7">
              <p>
                Maggsy is a Bath University Sports Science graduate and Level 4 in Sports Massage Therapy who understands the real demands of training, competing and recovery.
              </p>
              <p>
                As a competitive sprinter, Maggsy brings the first-hand experience of performance preparation, post-event recovery and staying resilient through hard training cycles.
              </p>
              <p>
                With his sports science, massage and athlete background he understands the true demands of sport and the importance of recovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-blue py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl max-w-3xl mx-auto">
            More than relaxation – vital for maintaining the body and active lifestyle
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="bg-white rounded-2xl p-6 border-t-4 border-brand-gold shadow-lg">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-brand-blue text-lg">{b.title}</h3>
                  <p className="mt-2 text-gray-600 text-sm leading-6">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-blue bg-brand-gold px-3 py-1 rounded-full">
                Treatments
              </span>
              <h2 className="mt-2 text-3xl font-bold text-brand-blue sm:text-4xl">Targeted for training, competition and recovery</h2>
            </div>
            <div className="flex gap-4">
              <Link href="/treatments" className="text-sm font-medium text-brand-blue border border-brand-blue px-4 py-2 rounded-lg hover:bg-brand-blue hover:text-white transition-colors">
                View All
              </Link>
              <Link href="/booking" className="text-sm text-center font-medium bg-brand-gold text-brand-blue px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-bold">
                Book Now
              </Link>
            </div>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {featuredTreatments.map((t) => (
              <div key={t.id} className="border-t border-r border-b border-brand-blue/10 border-l-4 border-l-brand-gold rounded-2xl p-6 flex flex-col shadow-sm">
                <h3 className="font-bold text-brand-blue text-xl">{t.name}</h3>
                <p className="mt-2 text-gray-600 text-sm leading-6 flex-1">{t.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {t.pricing.map((p) => (
                    <span key={p.mins} className="text-xs border border-brand-blue/20 text-brand-blue rounded-full px-3 py-1">
                      {p.mins} mins · £{p.price}
                    </span>
                  ))}
                </div>
                <Link href="/booking" className="mt-4 text-center bg-brand-blue text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
