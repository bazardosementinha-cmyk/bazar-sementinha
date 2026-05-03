"use client";

import { getLabelTemplateSpec } from "@/lib/label-templates";

type LabelItem = {
  id: string;
  short_id: string;
  title: string;
  category: string;
  price: number;
  label_template: string | null;
  location_box: string | null;
  is_fragile?: boolean | null;
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function LabelSheet({ items, siteUrl }: { items: LabelItem[]; siteUrl: string }) {
  if (!items.length) {
    return <div className="rounded-2xl border bg-white p-6 text-center text-sm text-slate-500">Selecione itens para visualizar as etiquetas.</div>;
  }

  return (
    <div className="label-sheet grid gap-3 print:block">
      {items.map((item) => {
        const spec = getLabelTemplateSpec(item.label_template);
        const itemUrl = `${siteUrl.replace(/\/$/, "")}/i/${encodeURIComponent(item.short_id)}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(itemUrl)}`;
        return (
          <div
            key={item.id}
            className="label-card break-inside-avoid rounded-xl border bg-white p-3 text-slate-950 print:inline-block print:align-top"
            style={{ width: `${spec.widthMm}mm`, minHeight: `${spec.heightMm}mm` }}
          >
            <div className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt={`QR ${item.short_id}`} className="h-16 w-16 shrink-0 rounded border print:h-14 print:w-14" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-bold">#{item.short_id}</div>
                <div className="line-clamp-2 text-xs font-bold leading-tight">{item.title}</div>
                <div className="mt-1 text-xs font-semibold">{money(Number(item.price || 0))}</div>
                <div className="mt-1 text-[10px] text-slate-600">{item.category} • {spec.code}</div>
              </div>
            </div>
            {item.location_box ? <div className="mt-1 text-[10px] text-slate-600">Local: {item.location_box}</div> : null}
            {item.is_fragile ? <div className="mt-1 rounded bg-red-50 px-1 py-0.5 text-[10px] font-bold text-red-700">FRÁGIL</div> : null}
          </div>
        );
      })}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .label-card { margin: 4mm; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
