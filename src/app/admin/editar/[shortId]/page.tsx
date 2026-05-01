"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ContextHelp from "@/components/ContextHelp";
import LegendPreview from "@/components/LegendPreview";
import { ADMIN_HELP_TOPICS } from "@/lib/admin-help";
import { getLabelRecommendation } from "@/lib/item-taxonomy";

type Item = {
  short_id: string;
  status: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  condition: string | null;
  price: number | null;
  price_from: number | null;
  gender: string | null;
  age_group: string | null;
  season: string | null;
  size_type: string | null;
  size_value: string | null;
  location_box: string | null;
  notes_internal: string | null;
  subcategory?: string | null;
  item_type?: string | null;
  brand?: string | null;
  color?: string | null;
  material?: string | null;
  measurements?: string | null;
  condition_notes?: string | null;
  is_fragile?: boolean | null;
  requires_measurement?: boolean | null;
  label_template?: string | null;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro";
}

function clamp(s: string, max: number) {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "...";
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

function priceLine(price: number | null, priceFrom: number | null) {
  const p = typeof price === "number" && Number.isFinite(price) ? price.toFixed(2).replace(".", ",") : "";
  const pf = typeof priceFrom === "number" && Number.isFinite(priceFrom) ? priceFrom.toFixed(2).replace(".", ",") : "";
  if (pf && p) return `De R$ ${pf} por R$ ${p}`;
  if (p) return `R$ ${p}`;
  return "(informe o preco)";
}

function deepDiveDesc(title: string, condition: string, description: string | null) {
  const base =
    `${title} (${condition}). ` +
    "Peca pronta para uso imediato - otima oportunidade para economizar e aproveitar. " +
    "Ao comprar, voce ajuda o Bazar do Sementinha: 100% do valor e revertido para a acao social.";
  const d = (description || "").trim();
  return clamp(d || base, 320);
}

function buildCaption(opts: {
  title: string;
  condition: string;
  price: number | null;
  price_from: number | null;
  description: string | null;
  category: string;
}) {
  const address = "Rua Francisco de Assis Pupo, 390 - Vila Industrial - Campinas/SP";
  const t = opts.title.trim() ? opts.title.trim() : "Item do Bazar";
  const cond = opts.condition || "Muito bom";
  const desc = deepDiveDesc(t, cond, opts.description);
  return [
    `${t} (${cond})`,
    `Preco: ${priceLine(opts.price, opts.price_from)}`,
    "",
    desc,
    "",
    `Retirada no TUCXA2 (${address})`,
    "Nao realizamos trocas.",
  ].join("\n");
}


export default function AdminEditarPage() {
  const params = useParams();
  const router = useRouter();

  const shortId = String((params as Record<string, unknown>)?.shortId ?? "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [item, setItem] = useState<Item | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Outros");
  const [condition, setCondition] = useState("Muito bom");
  const [description, setDescription] = useState("");

  const [priceFrom, setPriceFrom] = useState("");
  const [price, setPrice] = useState("");

  const [gender, setGender] = useState("unissex");
  const [ageGroup, setAgeGroup] = useState("adulto");
  const [season, setSeason] = useState("todas");

  const [sizeType, setSizeType] = useState("livre");
  const [sizeValue, setSizeValue] = useState("");

  const [locationBox, setLocationBox] = useState("");
  const [notesInternal, setNotesInternal] = useState("");

  const [subcategory, setSubcategory] = useState("");
  const [itemType, setItemType] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [material, setMaterial] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [isFragile, setIsFragile] = useState(false);
  const [requiresMeasurement, setRequiresMeasurement] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      setOkMsg(null);
      try {
        const resp = await fetch(`/api/admin/item?short_id=${encodeURIComponent(shortId)}`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || "Falha ao carregar item");

        const it = data.item as Item;
        if (!alive) return;

        setItem(it);

        setTitle(it.title ?? "");
        setCategory(it.category ?? "Outros");
        setCondition(it.condition ?? "Muito bom");
        setDescription(it.description ?? "");

        setPriceFrom(it.price_from != null ? String(it.price_from).replace(".", ",") : "");
        setPrice(it.price != null ? String(it.price).replace(".", ",") : "");

        setGender(it.gender ?? "unissex");
        setAgeGroup(it.age_group ?? "adulto");
        setSeason(it.season ?? "todas");

        setSizeType(it.size_type ?? "livre");
        setSizeValue(it.size_value ?? "");

        setLocationBox(it.location_box ?? "");
        setNotesInternal(it.notes_internal ?? "");

        setSubcategory(it.subcategory ?? "");
        setItemType(it.item_type ?? "");
        setBrand(it.brand ?? "");
        setColor(it.color ?? "");
        setMaterial(it.material ?? "");
        setMeasurements(it.measurements ?? "");
        setConditionNotes(it.condition_notes ?? "");
        setIsFragile(Boolean(it.is_fragile));
        setRequiresMeasurement(Boolean(it.requires_measurement));
      } catch (e: unknown) {
        if (!alive) return;
        setError(getErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (shortId) void load();
    return () => {
      alive = false;
    };
  }, [shortId]);

  const caption = useMemo(() => {
    const p = price ? Number(price.replace(".", "").replace(",", ".")) : null;
    const pf = priceFrom ? Number(priceFrom.replace(".", "").replace(",", ".")) : null;

    return buildCaption({
      title,
      condition,
      price: p,
      price_from: pf,
      description,
      category,
    });
  }, [title, condition, price, priceFrom, description, category]);

  const hashtags = useMemo(() => buildHashtags(category || "Outros"), [category]);
  const labelRecommendation = getLabelRecommendation({ category, sizeType, title, notesInternal });

  async function onSave() {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      if (!item) throw new Error("Item não carregado");
      if (item.status !== "review") throw new Error("Só é possível editar itens em rascunho (review).");

      const payload = {
        short_id: item.short_id,
        title,
        description,
        category,
        condition,
        price: price || null,
        price_from: priceFrom || null,
        gender,
        age_group: ageGroup,
        season,
        size_type: sizeType,
        size_value: sizeValue,
        location_box: locationBox,
        notes_internal: notesInternal,
        subcategory,
        item_type: itemType,
        brand,
        color,
        material,
        measurements,
        condition_notes: conditionNotes,
        is_fragile: isFragile,
        requires_measurement: requiresMeasurement,
        label_template: labelRecommendation.code,
      };

      const resp = await fetch("/api/admin/update-item", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao salvar");

      setOkMsg("Salvo com sucesso!");
      setTimeout(() => setOkMsg(null), 1500);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Editar item (rascunho)</h1>
          <p className="mt-1 text-slate-600">Ajuste os campos antes de publicar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/itens" className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
            Voltar para Itens
          </Link>
          {item ? (
            <Link
              href={`/admin/ver/${encodeURIComponent(item.short_id)}`}
              className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
            >
              Ver
            </Link>
          ) : null}
        </div>
      </div>

      <ContextHelp topic={ADMIN_HELP_TOPICS.editar} className="mt-4" />

      {loading ? <div className="mt-6 text-slate-600">Carregando...</div> : null}

      {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {okMsg ? <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{okMsg}</div> : null}

      {item ? (
        item.status !== "review" ? (
          <div className="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Este item está com status <b>{item.status}</b>. Por segurança, edição está bloqueada.
            <div className="mt-2">
              <button
                type="button"
                onClick={() => router.push(`/admin/ver/${encodeURIComponent(item.short_id)}`)}
                className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
              >
                Abrir tela de verificação
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Título</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="Ex.: Pelúcia Nemo Disney (laranja)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="Ex.: Roupas"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[120px]"
                  placeholder="Texto curto e direto..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Preço de (opcional)</label>
                  <input
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="Ex.: 120,00"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Preço (por)</label>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="Ex.: 100,00"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Condição</label>
                  <select
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
                    value={locationBox}
                    onChange={(e) => setLocationBox(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="Ex.: Caixa A-03"
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="font-semibold mb-2">Classificação e tamanho</div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Sexo</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                      <option value="unissex">Unissex</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Faixa etária</label>
                    <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
                      <option value="infantil">Infantil</option>
                      <option value="adolescente">Adolescente</option>
                      <option value="adulto">Adulto</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estação</label>
                    <select value={season} onChange={(e) => setSeason(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
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
                    <select value={sizeType} onChange={(e) => setSizeType(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
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
                    <input value={sizeValue} onChange={(e) => setSizeValue(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: M / 38 / 25cm" />
                  </div>
                </div>
              </div>



              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="font-semibold mb-2">Dados operacionais</div>
                <p className="mb-3 text-sm text-slate-600">
                  Use para diferenciar itens diversos, sugerir etiqueta, controlar fragilidade e facilitar separação.
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Subcategoria</label>
                    <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: Feminino / Casa" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tipo específico</label>
                    <input value={itemType} onChange={(e) => setItemType(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: Vestido / Travessa" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Marca</label>
                    <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: Disney" />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Cor principal</label>
                    <input value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: Azul" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Material</label>
                    <input value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: vidro / algodão" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Medidas</label>
                    <input value={measurements} onChange={(e) => setMeasurements(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: 20 x 15 cm" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-medium">Observações de condição</label>
                  <input value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ex.: pequeno risco na lateral" />
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <label className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2">
                    <input type="checkbox" checked={isFragile} onChange={(e) => setIsFragile(e.target.checked)} />
                    Item frágil
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2">
                    <input type="checkbox" checked={requiresMeasurement} onChange={(e) => setRequiresMeasurement(e.target.checked)} />
                    Exige medida/tamanho
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <div className="font-bold">Sugestão de etiqueta: {labelRecommendation.title}</div>
                <p className="mt-1">{labelRecommendation.description}</p>
                <p className="mt-1 text-emerald-800">{labelRecommendation.printHint}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Observação interna (opcional)</label>
                <input
                  value={notesInternal}
                  onChange={(e) => setNotesInternal(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="Ex.: pequena mancha (foto 3)"
                />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void onSave()}
                className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>

            <LegendPreview caption={caption} hashtags={hashtags} />
          </div>
        )
      ) : null}
    </div>
  );
}
