import { Shell, TopBar } from "@/components/Shell";
import { StatusBadge } from "@/components/Badge";
import { formatBRL } from "@/lib/utils";
import { getItemByShortId, getItemPhotos, signedUrlsForPaths } from "@/lib/db";

type Props = {
  params: Promise<{ shortId: string }>;
};

export default async function ItemPage({ params }: Props) {
  const { shortId } = await params;

  const item = await getItemByShortId(shortId);
  if (!item) {
    return (
      <>
        <TopBar />
        <Shell>
          <h1 className="text-xl font-bold">Item não encontrado</h1>
          <p className="mt-2 text-slate-600">Verifique o link/QR e tente novamente.</p>
        </Shell>
      </>
    );
  }

  const photos = await getItemPhotos(item.id);
  const paths = photos.map((p) => p.storage_path);
  const signedMap = paths.length ? await signedUrlsForPaths(paths) : {};
  const signedUrls = photos.map((p) => signedMap[p.storage_path]).filter(Boolean);

  const msg = encodeURIComponent(`Olá! Tenho interesse no item #${item.short_id}. Ele ainda está disponível?`);
  const waLink = `https://wa.me/?text=${msg}`;
  const igLink = item.source_url ?? "https://www.instagram.com/bazardosementinha/";

  return (
    <>
      <TopBar />
      <Shell>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <div className="mt-1 text-sm text-slate-600">
              {item.category} • {item.condition}
              {item.size ? ` • Tam.: ${item.size}` : ""}
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="flex items-baseline gap-3">
            {item.price_from ? (
              <span className="text-sm text-slate-500 line-through">{formatBRL(item.price_from)}</span>
            ) : null}
            <span className="text-2xl font-extrabold">{formatBRL(item.price)}</span>
          </div>
          {item.description ? <p className="mt-3 text-slate-700 whitespace-pre-line">{item.description}</p> : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {signedUrls.length ? (
            signedUrls.map((u, i) => (
              <div key={i} className="rounded-2xl border bg-white overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Foto ${i + 1}`} className="w-full h-72 object-cover" />
              </div>
            ))
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-slate-600">Sem fotos cadastradas.</div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a href={waLink} className="rounded-2xl bg-emerald-600 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-700">
            Reservar / Tirar dúvida no WhatsApp
          </a>
          <a href={igLink} className="rounded-2xl border bg-white px-4 py-3 text-center font-semibold hover:bg-slate-50">
            Ver no Instagram / Direct
          </a>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 text-sm text-slate-700">
          <div className="font-semibold">Regras (resumo)</div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Pagamento preferencial por Pix.</li>
            <li>Retirada combinada (TUCXA2) ou no dia do bazar.</li>
            <li>Sem troca.</li>
            <li>Ao reservar: confirmar prazo e disponibilidade.</li>
          </ul>
          <div className="mt-3 text-xs text-slate-500">ID do item: #{item.short_id}</div>
        </div>
      </Shell>
    </>
  );
}