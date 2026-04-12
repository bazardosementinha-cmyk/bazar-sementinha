"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatBRL, statusLabel, type ItemStatus } from "@/lib/utils";

type ItemRow = {
  id: string;
  short_id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  price_from: number | null;
  status: ItemStatus;
  created_at: string;
};

const tabs: Array<{ key: ItemStatus | "all"; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "review", label: "Em revisão" },
  { key: "available", label: "Disponível" },
  { key: "reserved", label: "Reservado" },
  { key: "sold", label: "Vendido" },
];

export default function ItensPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [tab, setTab] = useState<ItemStatus | "all">("review");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const resp = await fetch("/api/admin/items");
    const data = await resp.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((i) => i.status === tab);
  }, [items, tab]);

  async function setStatus(itemId: string, status: ItemStatus) {
    setBusyId(itemId);
    await fetch("/api/admin/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ item_id: itemId, status }),
    });
    await load();
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/importar">Importar</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/itens">Itens</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/pedidos">Pedidos</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/relatorio">Relatório</Link>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Itens</h1>
          <p className="mt-1 text-slate-600">Gerencie status para evitar confusão (Disponível / Reservado / Vendido).</p>
        </div>
        <form action="/api/admin/seed" method="post">
          <button className="rounded-xl border bg-white px-4 py-2 font-semibold hover:bg-slate-50">Criar itens demo</button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={t.key === tab ? "rounded-full bg-slate-900 px-3 py-1 text-sm text-white" : "rounded-full border bg-white px-3 py-1 text-sm hover:bg-slate-50"}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Preço</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="px-3 py-2 font-mono">#{it.short_id}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-xs text-slate-500">{it.condition}</div>
                </td>
                <td className="px-3 py-2">{it.category}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold">{formatBRL(Number(it.price))}</div>
                  {it.price_from ? <div className="text-xs text-slate-500 line-through">{formatBRL(Number(it.price_from))}</div> : null}
                </td>
                <td className="px-3 py-2">{statusLabel(it.status)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <a className="rounded-lg border px-2 py-1 hover:bg-slate-50" href={`/i/${it.short_id}`} target="_blank" rel="noreferrer">Ver</a>
                    <a className="rounded-lg border px-2 py-1 hover:bg-slate-50" href={`/admin/qr/${it.short_id}`} target="_blank" rel="noreferrer">QR</a>
                    <button disabled={busyId === it.id} className="rounded-lg bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-700 disabled:opacity-60"
                      onClick={() => setStatus(it.id, "available")}>Disponível</button>
                    <button disabled={busyId === it.id} className="rounded-lg bg-amber-600 px-2 py-1 text-white hover:bg-amber-700 disabled:opacity-60"
                      onClick={() => setStatus(it.id, "reserved")}>Reservar</button>
                    <button disabled={busyId === it.id} className="rounded-lg bg-slate-700 px-2 py-1 text-white hover:bg-slate-800 disabled:opacity-60"
                      onClick={() => setStatus(it.id, "sold")}>Vendido</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Nenhum item neste filtro.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
