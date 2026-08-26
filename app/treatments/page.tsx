import Link from "next/link";

const treatments = [
  {
    id: "sports-massage",
    name: "Sports Massage",
    description: "Designed to aid performance, prevent injury and support recovery through movement and deep tissue techniques. Suitable before or after exercise.",
    durations: [{ mins: 30, price: 25 }, { mins: 45, price: 35 }, { mins: 60, price: 45 }],
  },
  {
    id: "full-body-reset",
    name: "Full Body Reset",
    description: "A full-length sports massage that targets all muscle groups for total body recovery and reset.",
    durations: [{ mins: 90, price: 65 }],
  },
  {
    id: "pre-event",
    name: "Pre-Event Treatment",
    description: "Activating and stimulating massage to prime your muscles for competition. Increases blood flow, reduces muscle tension and sharpens neuromuscular readiness.",
    durations: [{ mins: 30, price: 25 }],
  },
  {
    id: "post-event",
    name: "Post-Event Recovery",
    description: "Gentle yet effective techniques to flush out waste products, reduce DOMS and speed up recovery after competition or intense training.",
    durations: [{ mins: 30, price: 25 }],
  },
];

export default function TreatmentsPage() {
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

      <div className="bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-brand-blue/20 bg-gray-100 text-gray-400 text-sm">
            [ Treatment Photos — add here when available ]
          </div>
        </div>
      </div>

      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid gap-8 lg:grid-cols-2">
          {treatments.map((t) => (
            <div key={t.id} className="border border-brand-blue/10 rounded-2xl p-8 flex flex-col shadow-sm">
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
          ))}
        </div>
      </div>
    </div>
  );
}
