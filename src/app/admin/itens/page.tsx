"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch("/api/admin/items");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao carregar itens");
      setItems((data.items ?? []) as ItemRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((i) => i.status === tab);
  }, [items, tab]);

  async function setStatus(item: ItemRow, status: ItemStatus) {
    setBusy(true);
    setError(null);
    try {
      let sold_price: string | undefined;
      if (status === "sold") {
        const hint = `Valor do anúncio: ${formatBRL(item.price)}\n\nDica: se vendeu no físico por valor diferente, informe aqui. Se for o mesmo, deixe em branco.`;
        const v = window.prompt(`Vendido — informe o valor final (opcional)\n\n${hint}`, "");
        if (v != null && v.trim() !== "") sold_price = v.trim();
      }

      const resp = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short_id: item.short_id, status, sold_price }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao atualizar status");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft(item: ItemRow) {
    const ok = window.confirm(
      `Excluir o item #${item.short_id} (${item.title})?\n\nSomente itens em \'Em revisão\' podem ser excluídos.`
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const resp = await fetch("/api/admin/delete-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short_id: item.short_id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao excluir item");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header: Itens + ações no mesmo nível */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Itens</h1>
          <p className="mt-1 text-slate-600">Gerencie status (Disponível / Reservado / Vendido).</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/pedidos"
            className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
          >
            Pedidos
          </Link>
          <Link
            href="/admin/relatorio"
            className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
          >
            Relatório
          </Link>
        </div>
      </div>

      {/* Tabs row */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/importar"
          className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
        >
          Criar
        </Link>

        {tabs.map((t) => (
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

      {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {busy ? <div className="mt-3 text-sm text-slate-500">Carregando…</div> : null}

      <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-3 font-mono">#{i.short_id}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{i.title}</div>
                  <div className="text-xs text-slate-500">{i.condition}</div>
                </td>
                <td className="px-4 py-3">{i.category}</td>
                <td className="px-4 py-3">{formatBRL(i.price)}</td>
                <td className="px-4 py-3">{statusLabel(i.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {/* Ver (admin) abre mesmo se estiver em revisão */}
                    <Link
                      href={`/admin/ver/${i.short_id}`}
                      className="rounded-xl border px-3 py-1 hover:bg-slate-50"
                      target="_blank"
                    >
                      Ver
                    </Link>
                    {/* Público (cliente) */}
                    <Link
                      href={`/i/${i.short_id}`}
                      className="rounded-xl border px-3 py-1 hover:bg-slate-50"
                      target="_blank"
                    >
                      Público
                    </Link>
                    <Link
                      href={`/admin/qr/${i.short_id}`}
                      className="rounded-xl border px-3 py-1 hover:bg-slate-50"
                      target="_blank"
                    >
                      QR
                    </Link>

                    <button
                      onClick={() => void setStatus(i, "available")}
                      className="rounded-xl bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700"
                    >
                      Disponível
                    </button>
                    <button
                      onClick={() => void setStatus(i, "reserved")}
                      className="rounded-xl bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700"
                    >
                      Reservar
                    </button>
                    <button
                      onClick={() => void setStatus(i, "sold")}
                      className="rounded-xl bg-slate-900 px-3 py-1 font-semibold text-white hover:bg-black"
                    >
                      Vendido
                    </button>

                    {i.status === "review" ? (
                      <button
                        onClick={() => void deleteDraft(i)}
                        className="rounded-xl border border-red-300 bg-red-50 px-3 py-1 font-semibold text-red-700 hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr className="border-t">
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Nenhum item nesta aba.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
