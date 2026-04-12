"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { extractPricesFromCaption } from "@/lib/price";

type ImportResult = { short_id: string; status: string };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro";
}

export default function ImportarPage() {
  const [caption, setCaption] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState("Acessórios");
  const [condition, setCondition] = useState("Muito bom");
  const [size, setSize] = useState("");
  const [locationBox, setLocationBox] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prices = useMemo(() => extractPricesFromCaption(caption), [caption]);

  const suggestedTitle = useMemo(() => {
    const firstLine = caption.split("\n").find((l) => l.trim()) || "";
    return (title || firstLine).slice(0, 60);
  }, [caption, title]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    const fd = new FormData(e.currentTarget);

    // Ensure title always sent
    if (!fd.get("title")) fd.set("title", suggestedTitle || "Item do Bazar");

    try {
      const resp = await fetch("/api/admin/import", { method: "POST", body: fd });
      const data: unknown = await resp.json();

      if (!resp.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Falha ao importar";
        throw new Error(msg);
      }

      const ok = data as ImportResult;
      setResult(ok);

      e.currentTarget.reset();
      setCaption("");
      setTitle("");
      setNote("");
      setSourceUrl("");
      setSize("");
      setLocationBox("");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/importar">Importar</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/itens">Itens</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/pedidos">Pedidos</Link>
        <Link className="rounded-xl border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50" href="/admin/relatorio">Relatório</Link>
      </div>
      <h1 className="text-2xl font-bold">Importar (assistido)</h1>
      <p className="mt-1 text-slate-600">
        Cole a legenda do post (ou descreva o item) e envie as fotos. O sistema extrai o preço e cria um rascunho para revisão.
      </p>

      <form onSubmit={onSubmit} className="mt-6 rounded-2xl border bg-white p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">URL do post (opcional)</label>
            <input
              name="source_url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="https://www.instagram.com/p/..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Título curto</label>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: Bolsa feminina (marrom)"
            />
            <div className="mt-1 text-xs text-slate-500">
              Sugestão automática: <span className="font-mono">{suggestedTitle}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Legenda / descrição (colar)</label>
          <textarea
            name="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[140px]"
            placeholder="Cole aqui a legenda do Instagram (incluindo preço)..."
          />
          <div className="mt-1 text-xs text-slate-500">
            Detectado: {prices.price_from ? `De R$ ${prices.price_from} ` : ""}
            {prices.price ? `Por R$ ${prices.price}` : "sem preço detectado"}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Categoria</label>
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
              <option>Roupas</option>
              <option>Calçados</option>
              <option>Acessórios</option>
              <option>Guloseimas</option>
              <option>Outros</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Estado</label>
            <select name="condition" value={condition} onChange={(e) => setCondition(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
              <option>Novo</option>
              <option>Muito bom</option>
              <option>Bom</option>
              <option>Regular</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Tamanho/medidas (opcional)</label>
            <input
              name="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: 38 / M / 25cm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Local/caixa (opcional)</label>
            <input
              name="location_box"
              value={locationBox}
              onChange={(e) => setLocationBox(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: Caixa A-03"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Observação (opcional)</label>
          <input name="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: pequena mancha (foto 3)" />
        </div>

        <div>
          <label className="text-sm font-medium">Fotos (3-6)</label>
          <input name="photos" type="file" accept="image/*" multiple required className="mt-1 w-full rounded-xl border px-3 py-2" />
          <div className="mt-1 text-xs text-slate-500">Padrão sugerido: 1) principal 2) etiqueta/marca/tamanho 3) defeito (se houver) + extras.</div>
        </div>

        <button disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {busy ? "Importando..." : "Importar e criar rascunho"}
        </button>

        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {result ? (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            Criado: <b>#{result.short_id}</b> (status: {result.status}).{" "}
            <a className="underline" href={`/i/${result.short_id}`} target="_blank" rel="noreferrer">
              Abrir página do item
            </a>{" "}
            |{" "}
            <a className="underline" href={`/admin/qr/${result.short_id}`} target="_blank" rel="noreferrer">
              Ver QR
            </a>
          </div>
        ) : null}
      </form>
    </div>
  );
}