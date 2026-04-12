"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  total: number;
  customer_instagram: string;
  expires_at: string;
  created_at: string;
  items_count: number;
};

function brDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function statusBadge(status: string) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
  if (status === "reserved") return <span className={`${base} bg-amber-100 text-amber-800`}>Reservado</span>;
  if (status === "paid") return <span className={`${base} bg-emerald-100 text-emerald-800`}>Pago</span>;
  if (status === "delivered") return <span className={`${base} bg-slate-200 text-slate-800`}>Entregue</span>;
  if (status === "cancelled") return <span className={`${base} bg-red-100 text-red-800`}>Cancelado</span>;
  return <span className={`${base} bg-slate-100 text-slate-700`}>{status}</span>;
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tab, setTab] = useState<string>("reserved");

  async function load() {
    const resp = await fetch("/api/admin/orders");
    const data = await resp.json();
    setOrders((data.orders ?? []) as OrderRow[]);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    return orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="mt-1 text-slate-600">Reservas com expiração (24h) + lembretes (assistido) + baixa (pago/entregue).</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-xl border bg-white px-4 py-2 font-semibold hover:bg-slate-50" href="/admin/itens">Itens</Link>
          <Link className="rounded-xl border bg-white px-4 py-2 font-semibold hover:bg-slate-50" href="/admin/importar">Importar</Link>
          <button onClick={() => void load()} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-black">Atualizar</button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { key: "reserved", label: "Reservados" },
          { key: "paid", label: "Pagos" },
          { key: "delivered", label: "Entregues" },
          { key: "cancelled", label: "Cancelados" },
          { key: "all", label: "Todos" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              t.key === tab
                ? "rounded-full bg-slate-900 px-3 py-1 text-sm text-white"
                : "rounded-full border bg-white px-3 py-1 text-sm hover:bg-slate-50"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Itens</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Expira</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2 font-mono">{o.code}</td>
                <td className="px-3 py-2">@{o.customer_instagram}</td>
                <td className="px-3 py-2">{o.items_count}</td>
                <td className="px-3 py-2 font-semibold">R$ {Number(o.total).toFixed(2).replace(".", ",")}</td>
                <td className="px-3 py-2">{statusBadge(o.status)}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{brDateTime(o.expires_at)}</td>
                <td className="px-3 py-2">
                  <Link className="rounded-lg border px-2 py-1 hover:bg-slate-50" href={`/admin/pedidos/${o.id}`}>Abrir</Link>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                  Nenhum pedido neste filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
