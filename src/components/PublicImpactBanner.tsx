import Link from "next/link";
import { PUBLIC_IMPACT_COPY } from "@/lib/public-copy";

export default function PublicImpactBanner() {
  return (
    <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h2 className="text-xl font-extrabold">{PUBLIC_IMPACT_COPY.title}</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">{PUBLIC_IMPACT_COPY.description}</p>
          <Link
            href="#catalogo"
            className="mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Contribuir agora
          </Link>
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
