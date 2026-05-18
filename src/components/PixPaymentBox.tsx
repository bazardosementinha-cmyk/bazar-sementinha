"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { buildPixBrCode } from "@/lib/pix-brcode";

type PixPaymentBoxProps = {
  amount: number;
  txid?: string;
  title?: string;
  subtitle?: string;
};

const PIX_KEY = "58.392.598/0001-91";
const PIX_FAVORED = "Templo de Umbanda Caboclo Sete Flexa";
const PIX_CITY = "CAMPINAS";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PixPaymentBox({ amount, txid, title, subtitle }: PixPaymentBoxProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pixPayload = useMemo(
    () =>
      buildPixBrCode({
        key: PIX_KEY,
        merchantName: PIX_FAVORED,
        merchantCity: PIX_CITY,
        amount,
        txid: txid || "BAZAR",
        description: title || "Bazar do Sementinha",
      }),
    [amount, title, txid]
  );

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(pixPayload, { margin: 1, width: 220, errorCorrectionLevel: "M" })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [pixPayload]);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-emerald-900">
        Use o QR Code ou Pix Copia e Cola com o valor preenchido
      </div>
      <div className="mt-1 text-xl font-black text-emerald-950">{title || "Pagamento Pix"}</div>
      {subtitle && <p className="mt-1 text-sm text-emerald-900">{subtitle}</p>}

      <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-[150px_1fr]">
          <div className="flex min-h-[150px] items-center justify-center rounded-xl bg-emerald-50 p-2">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR Code Pix" className="h-36 w-36" />
            ) : (
              <span className="text-xs text-neutral-500">Gerando QR Code…</span>
            )}
          </div>

          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-800">Pix com valor preenchido</div>
            <div className="mt-1 text-2xl font-black text-emerald-950">{formatBRL(amount)}</div>
            <div className="mt-1 text-xs text-neutral-600">Chave: {PIX_KEY} · Tucxa</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy(pixPayload)}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Copiar Pix Copia e Cola
              </button>
              <button
                type="button"
                onClick={() => void copy(PIX_KEY)}
                className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                Copiar chave
              </button>
              {copied && <span className="self-center text-sm font-medium text-emerald-800">Copiado!</span>}
            </div>
            <textarea
              readOnly
              value={pixPayload}
              className="mt-3 h-24 w-full rounded-lg border bg-neutral-50 p-2 font-mono text-xs text-neutral-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
