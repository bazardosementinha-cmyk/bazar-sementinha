"use client";

import { useEffect, useMemo, useState } from "react";
import LabelSheet from "@/components/LabelSheet";

type ItemRow = {
  id: string;
  short_id: string;
  title: string;
  category: string;
  price: number;
  status: string;
  label_template: string | null;
  location_box: string | null;
  is_fragile: boolean | null;
  is_demo?: boolean | null;
};

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Erro";
}

export default function BatchLabelPrint({ demoOnly = false, siteUrl }: { demoOnly?: boolean; siteUrl: string }) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [category, setCategory] = useState("all");
  const [label, setLabel] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (demoOnly) params.set("demo", "1");
      const resp = await fetch(`/api/admin/labels/batch?${params.toString()}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao carregar itens");
      const next = Array.isArray(data?.items) ? (data.items as ItemRow[]) : [];
      setItems(next);
      setSelected(Object.fromEntries(next.map((item) => [item.id, demoOnly])));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoOnly]);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);
  const labels = useMemo(() => Array.from(new Set(items.map((item) => item.label_template || "M"))).sort(), [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (label !== "all" && (item.label_template || "M") !== label) return false;
      return true;
    });
  }, [items, category, label]);

  const selectedItems = useMemo(() => items.filter((item) => selected[item.id]), [items, selected]);

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => ({ ...prev, ...Object.fromEntries(filtered.map((item) => [item.id, checked])) }));
  }

  return (
    <div>
      <div className="no-print rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold">Selecionar itens para impressão</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use esta tela para imprimir etiquetas em lote. Para demonstração aos coordenadores, filtre por catálogo demo e imprima todos os exemplos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full border bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => toggleAllVisible(true)}>
              Selecionar visíveis
            </button>
            <button type="button" className="rounded-full border bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => toggleAllVisible(false)}>
              Limpar visíveis
            </button>
            <button type="button" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => window.print()}>
              Imprimir {selectedItems.length} etiqueta(s)
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium">
            Categoria
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
              <option value="all">Todas</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Modelo de etiqueta
            <select value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
              <option value="all">Todos</option>
              {labels.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <b>{selectedItems.length}</b> selecionado(s) de <b>{filtered.length}</b> visível(is).
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {loading ? <div className="mt-4 text-sm text-slate-500">Carregando...</div> : null}

        <div className="mt-4 max-h-[360px] overflow-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Imprimir</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Etiqueta</th>
                <th className="px-3 py-2">Local</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2"><input type="checkbox" checked={!!selected[item.id]} onChange={(e) => setSelected((prev) => ({ ...prev, [item.id]: e.target.checked }))} /></td>
                  <td className="px-3 py-2 font-mono">#{item.short_id}</td>
                  <td className="px-3 py-2 font-medium">{item.title}</td>
                  <td className="px-3 py-2">{item.category}</td>
                  <td className="px-3 py-2">{item.label_template || "M"}</td>
                  <td className="px-3 py-2">{item.location_box || "-"}</td>
                </tr>
              ))}
              {!filtered.length ? <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Nenhum item encontrado.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print-area mt-6">
        <LabelSheet items={selectedItems} siteUrl={siteUrl} />
      </div>
    </div>
  );
}
