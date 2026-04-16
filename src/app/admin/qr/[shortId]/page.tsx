import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { shortId: string };

export default async function AdminQrPage({ params }: { params: Promise<Params> }) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect("/admin/login");

  const { shortId } = await params;

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const itemUrl = `${base}/i/${encodeURIComponent(shortId)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(itemUrl)}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">QR do item #{shortId}</h1>
          <p className="mt-1 text-sm text-slate-600">Aponte a câmera para abrir a página do item no site.</p>
        </div>
        <Link href="/admin/itens" className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
          Voltar
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-6">
        <div className="flex flex-col items-center gap-4">
          {/* QR externo (sem dependências) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt={`QR do item ${shortId}`} width={320} height={320} className="rounded-xl border" />
        </div>

        <div className="mt-5">
          <div className="text-xs text-slate-500 mb-1">Link do item</div>
          <div className="break-all rounded-xl bg-slate-50 p-3 text-sm">{itemUrl}</div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={itemUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Abrir item (público)
            </a>
            <a
              href={qrUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Abrir imagem do QR
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
