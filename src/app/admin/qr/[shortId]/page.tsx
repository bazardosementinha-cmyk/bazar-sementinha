import { Shell, TopBar } from "@/components/Shell";
import QRCode from "qrcode";
import { getItemByShortId } from "@/lib/db";

type Props = {
  params: Promise<{ shortId: string }>;
};

export default async function QrPage({ params }: Props) {
  const { shortId } = await params;

  const item = await getItemByShortId(shortId);

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const url = `${baseUrl}/i/${shortId}`;

  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });

  return (
    <>
      <TopBar />
      <Shell className="max-w-2xl">
        <h1 className="text-2xl font-bold">Etiqueta / QR</h1>
        <p className="mt-1 text-slate-600">Aponte a câmera do celular para abrir a página do item.</p>

        <div className="mt-4 rounded-2xl border bg-white p-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Code" className="h-64 w-64" />

          <div className="text-center">
            <div className="text-sm text-slate-600">ID do item</div>
            <div className="font-mono text-2xl font-extrabold">#{shortId}</div>
            <div className="mt-1 text-sm font-semibold">{item?.title ?? "Item do Bazar"}</div>
          </div>

          <div className="text-xs text-slate-500 break-all">{url}</div>
        </div>

        <div className="mt-4 text-sm text-slate-700">
          Dica: imprima esta tela (Ctrl+P) em papel adesivo para etiquetar o item/caixa.
        </div>
      </Shell>
    </>
  );
}