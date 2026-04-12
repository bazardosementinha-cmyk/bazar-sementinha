import { Shell, TopBar } from "@/components/Shell";
import { ItemCard } from "@/components/Card";
import { getPublicItems, getItemPhotos, signedUrlsForPaths } from "@/lib/db";

export default async function Page() {
  const items = await getPublicItems({ status: "all" });

  // Fetch first photo for each item (best-effort)
  const photoPaths: Array<{ short_id: string; path: string }> = [];
  for (const it of items) {
    const photos = await getItemPhotos(it.id);
    if (photos[0]?.storage_path) photoPaths.push({ short_id: it.short_id, path: photos[0].storage_path });
  }

  const signedMap = photoPaths.length
    ? await signedUrlsForPaths(photoPaths.map((p) => p.path))
    : {};

  const imageByShortId = new Map<string, string>();
  for (const p of photoPaths) {
    const url = signedMap[p.path];
    if (url) imageByShortId.set(p.short_id, url);
  }

  return (
    <>
      <TopBar
        right={
          <div className="flex items-center gap-3">
            <a href="/carrinho" className="text-sm text-slate-600 hover:text-slate-900">Carrinho</a>
            <a href="/admin/login" className="text-sm text-slate-600 hover:text-slate-900">Admin</a>
          </div>
        }
      />
      <Shell>
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <p className="mt-1 text-slate-600">
          Itens disponíveis (e reservados) do Bazar do Sementinha.
        </p>

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
          <div className="font-semibold">Regras (resumo)</div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Pagamento preferencial por Pix.</li>
            <li>Retirada combinada (TUCXA2) ou no dia do bazar.</li>
            <li>Sem troca (conforme comunicado do bazar).</li>
          </ul>
        </div>
      </Shell>
    </>
  );
}
