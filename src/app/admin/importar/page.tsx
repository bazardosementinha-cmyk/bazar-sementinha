"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type ImportResult = { short_id: string; status: string };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro";
}

function clamp(s: string, max: number) {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "...";
}

function deepDiveDescription(title: string, condition: string) {
  const raw =
    `${title} (${condition}). ` +
    "Peca pronta para uso imediato - otima oportunidade para economizar e aproveitar. " +
    "Ao comprar, voce ajuda o Bazar do Sementinha: 100% do valor e revertido para a acao social.";
  return clamp(raw, 320);
}

function toHashtagToken(text: string): string | null {
  const t = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "");
  if (!t) return null;
  return `#${t}`;
}

function buildHashtags(category: string) {
  const base = ["#bazar", "#sementinha", "#bazaronline", "#campinas", "#solidariedade"];
  const catTag = toHashtagToken(category);
  const all = catTag ? [...base, catTag] : base;
  return Array.from(new Set(all)).join(" ");
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

type CsvRow = Record<string, string>;

function parseCsvSemicolon(csvText: string): CsvRow | null {
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  const header = parseCsvLine(lines[0] ?? "", ";");
  const row = parseCsvLine(lines[1] ?? "", ";");
  if (!header.length || header.length !== row.length) return null;

  const out: CsvRow = {};
  header.forEach((h, i) => {
    const key = h.trim().replace(/^"|"$/g, "");
    out[key] = (row[i] ?? "").trim().replace(/^"|"$/g, "");
  });
  return out;
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i] ?? "";

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === sep) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

export default function CadastrarItemPage() {
  const formRef = useRef<HTMLFormElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [categories, setCategories] = useState<string[]>(["Roupas", "Calcados", "Acessorios", "Outros"]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Acessorios");
  const [condition, setCondition] = useState("Muito bom");

  const [gender, setGender] = useState("unissex");
  const [ageGroup, setAgeGroup] = useState("adulto");
  const [season, setSeason] = useState("todas");

  const [sizeType, setSizeType] = useState("livre");
  const [sizeValue, setSizeValue] = useState("");

  const [priceFrom, setPriceFrom] = useState("");
  const [price, setPrice] = useState("");

  const [locationBox, setLocationBox] = useState("");
  const [notesInternal, setNotesInternal] = useState("");

  const suggestedTitle = useMemo(() => (title.trim() ? title.trim() : "Item do Bazar"), [title]);
  const descriptionChars = useMemo(() => description.length, [description]);

  const address = "Rua Francisco de Assis Pupo, 390 - Vila Industrial - Campinas/SP";

  const priceLine = useMemo(() => {
    const p = price.trim();
    const pf = priceFrom.trim();
    if (pf && p) return `De R$ ${pf} por R$ ${p}`;
    if (p) return `R$ ${p}`;
    return "(informe o preco)";
  }, [price, priceFrom]);

  const captionPreview = useMemo(() => {
    const t = suggestedTitle;
    const cond = condition || "Muito bom";
    const desc = description.trim() ? clamp(description, 320) : deepDiveDescription(t, cond);

    return [
      `${t} (${cond})`,
      `Preco: ${priceLine}`,
      "",
      desc,
      "",
      `Retirada no TUCXA2 (${address})`,
      "Nao realizamos trocas.",
    ].join("\n");
  }, [suggestedTitle, condition, description, priceLine]);

  const captionWithHashtags = useMemo(() => {
    const tags = buildHashtags(category);
    return `${captionPreview}\n\n${tags}`;
  }, [captionPreview, category]);

  const captionChars = useMemo(() => captionPreview.length, [captionPreview]);

  const descCounterColor =
    descriptionChars > 320 ? "text-red-600" : descriptionChars > 280 ? "text-amber-600" : "text-slate-500";

  async function loadCategories() {
    try {
      const resp = await fetch("/api/admin/categories");
      const data = await resp.json();
      if (!resp.ok) return;
      const arr = Array.isArray(data?.categories) ? (data.categories as string[]) : [];
      const base = ["Roupas", "Calcados", "Acessorios", "Outros"];
      const merged = Array.from(new Set([...base, ...arr.filter((x) => typeof x === "string" && x.trim())]))
        .map((x) => x.trim())
        .sort((a, b) => a.localeCompare(b));
      setCategories(merged);
    } catch {
      // ignore
    }
  }

  function suggestLocal() {
    if (!title.trim()) setTitle("Item do Bazar");
    if (!description.trim()) setDescription(deepDiveDescription("Item do Bazar", condition || "Muito bom"));
  }

  async function onCopy() {
    const ok = await copyToClipboard(captionWithHashtags);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  async function onCsvChange(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const row = parseCsvSemicolon(text);
      if (!row) throw new Error("CSV invalido. Esperado: cabecalho + 1 linha, separado por ';'.");

      const get = (k: string) => (row[k] ?? "").trim();

      const t = get("title");
      const d = get("description");
      const c = get("category");
      const cond = get("condition");
      const p = get("price");
      const pf = get("price_from");
      const g = get("gender");
      const ag = get("age_group");
      const se = get("season");
      const st = get("size_type");
      const sv = get("size_value");
      const lb = get("location_box");
      const ni = get("notes_internal");

      if (t) setTitle(t);
      if (d) setDescription(clamp(d, 320));
      if (c) setCategory(c);
      if (cond) setCondition(cond);
      if (p) setPrice(p);
      if (pf) setPriceFrom(pf);

      if (g) setGender(g);
      if (ag) setAgeGroup(ag);
      if (se) setSeason(se);
      if (st) setSizeType(st);
      if (sv) setSizeValue(sv);

      if (lb) setLocationBox(lb);
      if (ni) setNotesInternal(ni);

      if (c) {
        setCategories((prev) => {
          if (prev.includes(c)) return prev;
          return Array.from(new Set([...prev, c])).sort((a, b) => a.localeCompare(b));
        });
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    const formEl = e.currentTarget;

    const fd = new FormData(formEl);
    if (!fd.get("title")) fd.set("title", suggestedTitle);

    const descFinal = description.trim()
      ? clamp(description, 320)
      : deepDiveDescription(suggestedTitle, condition || "Muito bom");
    fd.set("description", descFinal);

    try {
      const resp = await fetch("/api/admin/import", { method: "POST", body: fd });
      const data: unknown = await resp.json();

      if (!resp.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Falha ao criar rascunho";
        throw new Error(msg);
      }

      setResult(data as ImportResult);
      formEl.reset();

      setTitle("");
      setDescription("");
      setCategory("Acessorios");
      setCondition("Muito bom");
      setGender("unissex");
      setAgeGroup("adulto");
      setSeason("todas");
      setSizeType("livre");
      setSizeValue("");
      setPriceFrom("");
      setPrice("");
      setLocationBox("");
      setNotesInternal("");

      await loadCategories();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cadastrar item (assistido)</h1>
          <p className="mt-1 text-slate-600">
            Envie 3-6 fotos. Opcional: envie um CSV (1 item) gerado no ChatGPT para preencher os campos.
          </p>
        </div>
        <Link
          href="/admin/itens"
          className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
        >
          Voltar para Itens
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={suggestLocal}
          className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
        >
          Sugestao rapida
        </button>
        <button
          type="button"
          onClick={() => void loadCategories()}
          className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
        >
          Atualizar categorias
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form ref={formRef} onSubmit={onSubmit} className="rounded-2xl border bg-white p-5 space-y-4">
          <div>
            <label className="text-sm font-medium">CSV (opcional - 1 item)</label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              onChange={(e) => void onCsvChange(e.target.files?.[0] ?? null)}
            />
            <div className="mt-1 text-xs text-slate-500">
              Esperado: separador &quot;;&quot;, cabecalho + 1 linha.
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Fotos (3-6)</label>
            <input
              name="photos"
              type="file"
              accept="image/*"
              multiple
              required
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
            <div className="mt-1 text-xs text-slate-500">
              Padrao sugerido: 1) principal 2) etiqueta/marca/tamanho 3) defeito (se houver) + extras.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Titulo</label>
              <input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Blusa feminina (verde)"
              />
              <div className="mt-1 text-xs text-slate-500">
                Sugestao: <span className="font-mono">{suggestedTitle}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <input
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="category-list"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Roupas"
              />
              <datalist id="category-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="mt-1 text-xs text-slate-500">
                Se a categoria nao existir, digite e ela passara a aparecer no filtro.
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Descricao (Deep Dive - ajustavel)</label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[120px]"
              placeholder="Descricao curta e clara..."
            />
            <div className={`mt-1 text-xs ${descCounterColor}`}>
              {descriptionChars}/320 <span className="text-slate-400">(ideal ~280)</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                name="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                <option>Novo</option>
                <option>Muito bom</option>
                <option>Bom</option>
                <option>Regular</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Local/caixa</label>
              <input
                name="location_box"
                value={locationBox}
                onChange={(e) => setLocationBox(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Caixa A-03"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Preco &quot;de&quot; (opcional)</label>
              <input
                name="price_from"
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: 229,00"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Preco (por) *</label>
              <input
                name="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: 115,00"
                required
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="font-semibold mb-2">Facetas para roupas</div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Sexo</label>
                <select
                  name="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                >
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="unissex">Unissex</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Faixa etaria</label>
                <select
                  name="age_group"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                >
                  <option value="infantil">Infantil</option>
                  <option value="adolescente">Adolescente</option>
                  <option value="adulto">Adulto</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Estacao</label>
                <select
                  name="season"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                >
                  <option value="verao">Verao</option>
                  <option value="inverno">Inverno</option>
                  <option value="meia_estacao">Meia estacao</option>
                  <option value="todas">Todas</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mt-4">
              <div>
                <label className="text-sm font-medium">Tipo de tamanho</label>
                <select
                  name="size_type"
                  value={sizeType}
                  onChange={(e) => setSizeType(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                >
                  <option value="livre">Livre</option>
                  <option value="roupa_letras">Roupa (PP/P/M/G/GG)</option>
                  <option value="roupa_numero">Roupa (numero)</option>
                  <option value="calcado_br">Calcado (BR)</option>
                  <option value="infantil_idade">Infantil (idade)</option>
                  <option value="medidas_cm">Medidas (cm)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Valor do tamanho</label>
                <input
                  name="size_value"
                  value={sizeValue}
                  onChange={(e) => setSizeValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="Ex.: M / 38 / 25cm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Observacao (opcional)</label>
            <input
              name="notes_internal"
              value={notesInternal}
              onChange={(e) => setNotesInternal(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: pequena mancha (foto 3)"
            />
          </div>

          <button
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Criando..." : "Criar rascunho (Em revisao)"}
          </button>

          {error ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {result ? (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Criado: <b>#{result.short_id}</b> (status: {result.status}).{" "}
              <Link className="underline" href={`/i/${result.short_id}`} target="_blank" rel="noreferrer">
                Abrir item
              </Link>{" "}
              |{" "}
              <Link className="underline" href={`/admin/qr/${result.short_id}`} target="_blank" rel="noreferrer">
                Ver QR
              </Link>{" "}
              |{" "}
              <Link className="underline" href="/admin/itens">
                Ir para Itens
              </Link>
            </div>
          ) : null}
        </form>

        <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Preview (Instagram)</div>
              <div className="text-xs text-slate-500">Texto curto e direto (auto-limitado).</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500">{captionChars} chars</div>
              <button
                type="button"
                onClick={() => void onCopy()}
                className="rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                title="Copia o texto + hashtags padrao"
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border bg-slate-50 p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-800">{captionPreview}</pre>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Ao copiar, a legenda vai com hashtags padrao (ex.: #bazar #sementinha ...).
          </div>
        </div>
      </div>
    </div>
  );
}
