import Link from "next/link";

import { Shell, TopBar } from "@/components/Shell";
import { StatusBadge } from "@/components/Badge";
import { AddToCartButton } from "@/components/AddToCartButton";
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

  // Fotos (Supabase Storage)
  const photos = await getItemPhotos(item.id);
  const paths = photos.map((p) => p.storage_path);
  const signedMap = paths.length ? await signedUrlsForPaths(paths) : {};
  const signedUrls = photos
    .map((p) => signedMap[p.storage_path])
    .filter((u): u is string => typeof u === "string" && u.length > 0);

  const canAddToCart = item.status === "available";

  // WhatsApp suporte (por enquanto seu número)
  const SUPPORT_WA_E164 = "5519992360856"; // +55 19 99236-0856

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const itemUrl = siteUrl ? `${siteUrl}/i/${item.short_id}` : `/i/${item.short_id}`;

  const msg = encodeURIComponent(
    `Olá! Tenho interesse no item #${item.short_id} (${item.title}).\nLink: ${itemUrl}\nEle ainda está disponível?`
  );
  const waLink = `https://wa.me/${SUPPORT_WA_E164}?text=${msg}`;

  const address = "Rua Francisco de Assis Pupo, 390 – Vila Industrial – Campinas/SP";

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
          {item.description ? <p className="mt-3 whitespace-pre-line text-slate-700">{item.description}</p> : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {signedUrls.length ? (
            signedUrls.map((u, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Foto ${i + 1}`} className="h-72 w-full object-cover" />
              </div>
            ))
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-slate-600">Sem fotos cadastradas.</div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AddToCartButton shortId={item.short_id} disabled={!canAddToCart} />

          {canAddToCart ? (
            <Link
              href={`/checkout?buy=${encodeURIComponent(item.short_id)}`}
              className="rounded-2xl border bg-white px-4 py-3 text-center font-semibold hover:bg-slate-50"
            >
              Comprar agora
            </Link>
          ) : (
            <span className="rounded-2xl border bg-slate-50 px-4 py-3 text-center font-semibold text-slate-400">
              Comprar agora
            </span>
          )}

          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-700"
          >
            Dúvidas? Clique aqui.
          </a>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 text-sm text-slate-700">
          <div className="font-semibold">Informações Importantes</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
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
          <div className="mt-3 text-xs text-slate-500">ID do item: #{item.short_id}</div>
        </div>
      </Shell>
    </>
  );
}