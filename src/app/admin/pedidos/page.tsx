"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminNavPills from "@/components/AdminNavPills";
import { formatBRL } from "@/lib/utils";

type OrderStatus = "reserved" | "paid" | "delivered" | "canceled";

type OrderRow = {
  id?: string;
  order_id?: string;
  code?: string;
  short_id?: string;
  customer_instagram?: string;
  customer_name?: string;
  items_count?: number;
  total?: number;
  status?: OrderStatus;
  expires_at?: string | null;
  created_at?: string;
};

const filters: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "reserved", label: "Reservados" },
  { key: "paid", label: "Pagos" },
  { key: "delivered", label: "Entregues" },
  { key: "canceled", label: "Cancelados" },
  { key: "all", label: "Todos" },
];

function pillClass(active: boolean) {
  return active
    ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-sm font-semibold text-white"
    : "rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50";
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro";
}

function getApiError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  return typeof d.error === "string" ? d.error : null;
}

function normalizeOrders(data: unknown): OrderRow[] {
  const d = (data && typeof data === "object" ? (data as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const arr =
    (d.orders as unknown[]) ||
    (d.pedidos as unknown[]) ||
    (d.data as unknown[]) ||
    (d.rows as unknown[]) ||
    [];

  return Array.isArray(arr) ? (arr as OrderRow[]) : [];
}

function orderKey(o: OrderRow): string {
  return String(o.code || o.short_id || o.order_id || o.id || "");
}

function displayCode(o: OrderRow): string {
  const k = orderKey(o);
  if (!k) return "-";
  return k.length > 8 ? k.slice(0, 6).toUpperCase() : k.toUpperCase();
}

function displayCustomer(o: OrderRow): string {
  const ig = o.customer_instagram ? `@${String(o.customer_instagram).replace(/^@/, "")}` : "";
  const nm = o.customer_name ? String(o.customer_name) : "";
  return nm && ig ? `${nm} (${ig})` : nm || ig || "-";
}

function displayStatus(o: OrderRow): string {
  switch (o.status) {
    case "reserved":
      return "Reservado";
    case "paid":
      return "Pago";
    case "delivered":
      return "Entregue";
    case "canceled":
      return "Cancelado";
    default:
      return "-";
  }
}

function displayExpires(o: OrderRow): string {
  if (!o.expires_at) return "-";
  const dt = new Date(String(o.expires_at));
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("pt-BR");
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("reserved");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(): Promise<void> {
    setError(null);
    setRefreshing(true);

    const endpoints = ["/api/admin/orders", "/api/admin/pedidos", "/api/admin/orders/list"];
    let lastErr: string | null = null;

    for (const ep of endpoints) {
      try {
        const resp = await fetch(ep, { credentials: "include" });
        if (resp.status === 404) continue;

        const data: unknown = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          lastErr = getApiError(data) || `Falha ao carregar (${resp.status})`;
          continue;
        }

        setOrders(normalizeOrders(data));
        setRefreshing(false);
        return;
      } catch (e: unknown) {
        lastErr = getErrorMessage(e);
      }
    }

    setRefreshing(false);
    setError(lastErr || "Endpoint de pedidos não encontrado. Verifique /api/admin/orders.");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // (de propósito: carregar 1x ao abrir)

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <AdminNavPills />

      <p className="mt-2 text-slate-600">
        Reservas com expiração (24h) + lembretes (assistido) + baixa (pago/entregue).
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            className={pillClass(filter === f.key)}
            onClick={() => setFilter(f.key)}
            type="button"
          >
            {f.label}
          </button>
        ))}

        <button
          className={
            refreshing
              ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-sm font-semibold text-white"
              : "rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
          }
          onClick={() => void load()}
          type="button"
        >
          {refreshing ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {/* Mobile: cards */}
      <div className="mt-4 grid gap-3 md:hidden">
        {filtered.map((o) => (
          <div key={orderKey(o)} className="rounded-2xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Código</div>
                <div className="font-mono font-semibold">{displayCode(o)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Status</div>
                <div className="font-semibold">{displayStatus(o)}</div>
              </div>
            </div>

            <div className="mt-3 text-sm">
              <div className="text-slate-500">Cliente</div>
              <div className="font-medium">{displayCustomer(o)}</div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-slate-500">Itens</div>
                <div className="font-semibold">{o.items_count ?? "-"}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500">Total</div>
                <div className="font-semibold">{formatBRL(Number(o.total || 0))}</div>
              </div>
            </div>

            <div className="mt-3 text-sm">
              <div className="text-slate-500">Expira</div>
              <div className="font-medium">{displayExpires(o)}</div>
            </div>

            <div className="mt-3">
              <Link
                className="inline-flex rounded-lg border px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                href={`/admin/pedidos/${orderKey(o)}`}
              >
                Ver
              </Link>
            </div>
          </div>
        ))}

        {!filtered.length ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm text-slate-500">
            Nenhum pedido neste filtro.
          </div>
        ) : null}
      </div>

      {/* Desktop: tabela */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border bg-white md:block">
        <table className="min-w-[980px] w-full text-sm">
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
              <tr key={orderKey(o)} className="border-t">
                <td className="px-3 py-2 font-mono">{displayCode(o)}</td>
                <td className="px-3 py-2">{displayCustomer(o)}</td>
                <td className="px-3 py-2">{o.items_count ?? "-"}</td>
                <td className="px-3 py-2 font-semibold">{formatBRL(Number(o.total || 0))}</td>
                <td className="px-3 py-2">{displayStatus(o)}</td>
                <td className="px-3 py-2">{displayExpires(o)}</td>
                <td className="px-3 py-2">
                  <Link className="rounded-lg border px-2 py-1 hover:bg-slate-50" href={`/admin/pedidos/${orderKey(o)}`}>
                    Ver
                  </Link>
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