import Link from "next/link";
import { PUBLIC_PROCESS_COPY } from "@/lib/public-copy";

export default function PublicHowItWorks() {
  return (
    <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
      <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
        {PUBLIC_PROCESS_COPY.eyebrow}
      </div>

      <div className="mt-3 grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">{PUBLIC_PROCESS_COPY.title}</h2>
          <p className="mt-2 text-slate-600">{PUBLIC_PROCESS_COPY.description}</p>

          <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
            {PUBLIC_PROCESS_COPY.trustBullets.map((bullet) => (
              <li key={bullet} className="rounded-2xl bg-slate-50 px-3 py-2">
                {bullet}
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <Link
              href="#catalogo"
              className="inline-flex w-fit rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              Contribuir agora
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          {PUBLIC_PROCESS_COPY.steps.map((step, index) => (
            <div key={step.title} className="flex gap-3 rounded-2xl border bg-slate-50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {index + 1}
              </div>
              <div>
                <h3 className="font-bold text-slate-950">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
