"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro";
}

function pillClass(active: boolean) {
  return active
    ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-sm font-semibold text-white"
    : "rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50";
}

export default function AdminItensPage() {
  const pathname = usePathname();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("review");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const resp = await fetch("/api/admin/items");
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Falha ao carregar itens");
    setItems(Array.isArray(data?.items) ? (data.items as ItemRow[]) : []);
  }

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)));
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((it) => it.status === tab);
  }, [items, tab]);

  async function setStatus(short_id: string, status: ItemStatus) {
    setBusyId(short_id);
    setError(null);

    try {
      let payload: Record<string, unknown> = { short_id, status };

      if (status === "sold") {
        const input = window.prompt(
          "Preço final (opcional). Ex.: 55,00. Deixe em branco para manter o preço anunciado.",
          ""
        );
        if (input && input.trim()) payload = { ...payload, sold_price_final: input.trim() };
      }

      const resp = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao atualizar status");

      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(short_id: string) {
    if (!confirm(`Excluir o item #${short_id}? (somente rascunhos)`)) return;
    setBusyId(short_id);
    setError(null);
    try {
      const resp = await fetch("/api/admin/delete-item", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ short_id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao excluir");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  function ActionLinks({ it }: { it: ItemRow }) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link className="rounded-lg border px-2 py-1 hover:bg-slate-50" href={`/admin/ver/${it.short_id}`}>
          Ver
        </Link>
        <Link className="rounded-lg border px-2 py-1 hover:bg-slate-50" href={`/admin/editar/${it.short_id}`}>
          Editar
        </Link>
        <Link className="rounded-lg border px-2 py-1 hover:bg-slate-50" href={`/i/${it.short_id}`} target="_blank">
          Público
        </Link>
        <Link className="rounded-lg border px-2 py-1 hover:bg-slate-50" href={`/admin/qr/${it.short_id}`} target="_blank">
          QR
        </Link>
        {it.status === "review" ? (
          <button
            disabled={busyId === it.short_id}
            className="rounded-lg border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-60"
            onClick={() => onDelete(it.short_id)}
            type="button"
          >
            Excluir
          </button>
        ) : null}
      </div>
    );
  }

  function ActionStatusButtons({ it }: { it: ItemRow }) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busyId === it.short_id}
          className="rounded-lg bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-700 disabled:opacity-60"
          onClick={() => setStatus(it.short_id, "available")}
          type="button"
        >
          Disponível
        </button>
        <button
          disabled={busyId === it.short_id}
          className="rounded-lg bg-amber-600 px-2 py-1 text-white hover:bg-amber-700 disabled:opacity-60"
          onClick={() => setStatus(it.short_id, "reserved")}
          type="button"
        >
          Reservar
        </button>
        <button
          disabled={busyId === it.short_id}
          className="rounded-lg bg-slate-700 px-2 py-1 text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={() => setStatus(it.short_id, "sold")}
          type="button"
        >
          Vendido
        </button>
      </div>
    );
  }

  const isItens = pathname?.startsWith("/admin/itens");
  const isPedidos = pathname?.startsWith("/admin/pedidos");
  const isRelatorio = pathname?.startsWith("/admin/relatorio");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* ✅ Removido "Itens" duplicado (mantém apenas os pills) */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/itens" className={pillClass(!!isItens)}>
          Itens
        </Link>
        <Link href="/admin/pedidos" className={pillClass(!!isPedidos)}>
          Pedidos
        </Link>
        <Link href="/admin/relatorio" className={pillClass(!!isRelatorio)}>
          Relatório
        </Link>
      </div>

      <p className="mt-2 text-slate-600">Gerencie status (Disponível / Reservado / Vendido).</p>

      {/* ✅ "Criar" vem antes de "Todos" */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href="/admin/importar" className={pillClass(false)}>
          Criar
        </Link>

        {tabs.map((t) => (
          <button key={t.key} className={pillClass(tab === t.key)} onClick={() => setTab(t.key)} type="button">
            {t.label}
          </button>
        ))}
      </div>

      {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-4 grid gap-3 md:hidden">
        {filtered.map((it) => (
          <div key={it.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-slate-500">#{it.short_id}</div>
                <div className="font-semibold">{it.title}</div>
                <div className="text-xs text-slate-500">{it.condition}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">{it.category}</div>
                <div className="font-semibold">{formatBRL(Number(it.price))}</div>
                {it.price_from ? <div className="text-xs text-slate-500 line-through">{formatBRL(Number(it.price_from))}</div> : null}
                <div className="mt-1 text-xs font-semibold text-slate-700">{statusLabel(it.status)}</div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <ActionLinks it={it} />
              <ActionStatusButtons it={it} />
            </div>
          </div>
        ))}

        {!filtered.length ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm text-slate-500">Nenhum item neste filtro.</div>
        ) : null}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border bg-white md:block">
        <table className="min-w-[980px] w-full text-sm">
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
                    <ActionLinks it={it} />
                    <ActionStatusButtons it={it} />
                  </div>
                </td>
              </tr>
            ))}

            {!filtered.length ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                  Nenhum item neste filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
