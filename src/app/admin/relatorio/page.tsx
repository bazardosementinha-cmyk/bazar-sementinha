"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBRL, statusLabel, type ItemStatus } from "@/lib/utils";

type Row = { status: ItemStatus; count: number; total: number };

export default function RelatorioPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [soldTotal, setSoldTotal] = useState<number>(0);

  async function load() {
    const resp = await fetch("/api/admin/report");
    const data = await resp.json();
    setRows(data.rows || []);
    setSoldTotal(data.sold_total || 0);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/importar">Importar</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/itens">Itens</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/pedidos">Pedidos</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/relatorio">Relatório</Link>
      </div>
      <h1 className="text-2xl font-bold">Relatório (transparência)</h1>
      <p className="mt-1 text-slate-600">Resumo por status e total vendido (demo).</p>

      <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="text-sm text-slate-600">Total vendido</div>
        <div className="text-3xl font-extrabold">{formatBRL(soldTotal)}</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Qtd.</th>
              <th className="px-3 py-2">Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.status} className="border-t">
                <td className="px-3 py-2">{statusLabel(r.status)}</td>
                <td className="px-3 py-2">{r.count}</td>
                <td className="px-3 py-2">{formatBRL(r.total)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={3}>Sem dados.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Observação: no piloto real, este relatório pode ser filtrado por período e exportado (CSV/PDF).
      </div>
    </div>
  );
}
