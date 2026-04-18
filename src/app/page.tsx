import Link from "next/link";
import { Shell, TopBar } from "@/components/Shell";
import { ItemCard } from "@/components/Card";
import { getPublicItems, getItemPhotos, signedUrlsForPaths } from "@/lib/db";
import { supabasePublic } from "@/lib/supabase/public";

function isGuloseimas(cat: string | null | undefined) {
  return (cat ?? "").trim().toLowerCase() === "guloseimas";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const selectedCategory = (sp.category ?? "all").trim();

  // Categories for filter (available items only; exclude Guloseimas)
  const supabase = supabasePublic();
  const { data: catRows } = await supabase
    .from("items")
    .select("category, status")
    .eq("status", "available")
    .order("category", { ascending: true });

  const categories = Array.from(
    new Set((catRows ?? []).map((r) => (r as { category?: string }).category).filter((c): c is string => !!c && !isGuloseimas(c))),
  ).sort((a, b) => a.localeCompare(b));

  const items = await getPublicItems({
    status: "available",
    category: selectedCategory === "all" ? "all" : selectedCategory,
  });

  // Fetch first photo for each item (best-effort)
  const photoPaths: Array<{ short_id: string; path: string }> = [];
  for (const it of items) {
    const photos = await getItemPhotos(it.id);
    if (photos[0]?.storage_path) photoPaths.push({ short_id: it.short_id, path: photos[0].storage_path });
  }

  const signedMap = photoPaths.length ? await signedUrlsForPaths(photoPaths.map((p) => p.path)) : {};

  const imageByShortId = new Map<string, string>();
  for (const p of photoPaths) {
    const url = signedMap[p.path];
    if (url) imageByShortId.set(p.short_id, url);
  }

  const address = "Rua Francisco de Assis Pupo, 390 – Vila Industrial – Campinas/SP";

  return (
    <>
      <TopBar />
      <Shell>
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <p className="mt-1 text-slate-600">
          Escolha itens e reserve pelo site. Atendimento e confirmação pelo WhatsApp.
        </p>

        {/* Category filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/"
            className={
              selectedCategory === "all"
                ? "rounded-full bg-slate-900 px-3 py-1 text-sm text-white"
                : "rounded-full border bg-white px-3 py-1 text-sm hover:bg-slate-50"
            }
          >
            Todas
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/?category=${encodeURIComponent(c)}`}
              className={
                selectedCategory === c
                  ? "rounded-full bg-slate-900 px-3 py-1 text-sm text-white"
                  : "rounded-full border bg-white px-3 py-1 text-sm hover:bg-slate-50"
              }
            >
              {c}
            </Link>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ItemCard
              key={it.id}
              shortId={it.short_id}
              title={it.title}
              category={it.category}
              condition={it.condition}
              price={Number(it.price)}
              priceFrom={it.price_from ? Number(it.price_from) : null}
              status={it.status}
              imageUrl={imageByShortId.get(it.short_id) ?? null}
            />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border bg-white p-4 text-sm text-slate-700">
          <div className="font-semibold">Informações Importantes</div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              Pagamento por <b>Pix</b> ou <b>Cartão de Crédito</b> (para cartão: fazer um Pix de <b>R$ 10,00</b> para
              reserva; o valor é devolvido no pagamento/retirada).
            </li>
            <li>
              Retirada no <b>TUCXA2</b> ({address}) conforme data e horário combinado.
            </li>
            <li>
              <b>Não realizamos trocas.</b>
            </li>
          </ul>
        </div>
      </Shell>
    </>
  );
}
