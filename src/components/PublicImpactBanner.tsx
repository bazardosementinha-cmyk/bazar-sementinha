import Link from "next/link";
import { PUBLIC_IMPACT_COPY } from "@/lib/public-copy";

export default function PublicImpactBanner() {
  return (
    <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm sm:mt-6 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold leading-tight sm:text-2xl">{PUBLIC_IMPACT_COPY.title}</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900 sm:text-base">{PUBLIC_IMPACT_COPY.description}</p>

          <div className="mt-5">
            <Link
              href="#catalogo"
              className="inline-flex w-full justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 sm:w-fit sm:py-2"
            >
              Contribuir agora
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {PUBLIC_IMPACT_COPY.cards.map((card) => (
            <div key={card.title} className="rounded-2xl bg-white/80 p-4 shadow-sm">
              <h3 className="font-bold">{card.title}</h3>
              <p className="mt-1 text-sm text-emerald-900">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
