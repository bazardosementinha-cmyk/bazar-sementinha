"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEMO_CATALOG_ITEMS, demoPhotoDataUri, getDemoCatalogGroups, type DemoCatalogItem } from "@/lib/demo-catalog";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DemoCard({ item }: { item: DemoCatalogItem }) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={idx}
            src={demoPhotoDataUri(item, idx)}
            alt={`${item.title} - foto demo ${idx}`}
            className="aspect-[4/3] w-full rounded-xl border object-cover"
          />
        ))}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-slate-500">#{item.short_id}</div>
          <h3 className="font-bold text-slate-950">{item.title}</h3>
          <p className="mt-1 line-clamp-3 text-sm text-slate-600">{item.description}</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-bold text-emerald-700">{money(item.price)}</div>
          <div className="mt-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.label_template}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <div><b>Categoria:</b> {item.category}</div>
        <div><b>Tipo:</b> {item.item_type}</div>
        <div><b>Local:</b> {item.location_box}</div>
        <div><b>Estado:</b> {item.condition}</div>
      </div>
    </article>
  );
}

export default function DemoCatalogPreview() {
  const groups = useMemo(() => getDemoCatalogGroups(), []);
  const [activeGroup, setActiveGroup] = useState<string>(groups[0]?.group ?? "");
  const activeItems = useMemo(() => {
    if (!activeGroup) return DEMO_CATALOG_ITEMS;
    return DEMO_CATALOG_ITEMS.filter((item) => item.demo_group === activeGroup);
  }, [activeGroup]);

  return (
    <div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">Catálogo demo interno</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-900">
              Estes itens são exemplos para treinar cadastro, revisão, localização física e impressão de etiquetas em lote. Eles ficam marcados como demo e não devem aparecer na loja pública.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/etiquetas/lote?demo=1" className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Imprimir etiquetas demo
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {groups.map(({ group, items }) => (
          <button
            key={group}
            type="button"
            onClick={() => setActiveGroup(group)}
            className={activeGroup === group ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-sm font-semibold text-white" : "rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"}
          >
            {group} <span className="opacity-70">({items.length})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {activeItems.map((item) => <DemoCard key={item.short_id} item={item} />)}
      </div>
    </div>
  );
}
