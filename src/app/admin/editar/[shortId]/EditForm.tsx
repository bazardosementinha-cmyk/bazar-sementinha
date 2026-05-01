"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ContextHelp from "@/components/ContextHelp";
import { ADMIN_HELP_TOPICS } from "@/lib/admin-help";
import { getLabelRecommendation } from "@/lib/item-taxonomy";

type ItemRow = {
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

function fmtMoneyBR(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  return v.toFixed(2).replace(".", ",");
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro";
}

export default function EditForm({ initialItem }: { initialItem: ItemRow }) {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialItem.title ?? "");
  const [description, setDescription] = useState(initialItem.description ?? "");
  const [category, setCategory] = useState(initialItem.category ?? "");
  const [condition, setCondition] = useState(initialItem.condition ?? "Muito bom");

  const [priceFrom, setPriceFrom] = useState(fmtMoneyBR(initialItem.price_from));
  const [price, setPrice] = useState(fmtMoneyBR(initialItem.price));

  const [gender, setGender] = useState(initialItem.gender ?? "unissex");
  const [ageGroup, setAgeGroup] = useState(initialItem.age_group ?? "adulto");
  const [season, setSeason] = useState(initialItem.season ?? "todas");

  const [sizeType, setSizeType] = useState(initialItem.size_type ?? "livre");
  const [sizeValue, setSizeValue] = useState(initialItem.size_value ?? "");

  const [locationBox, setLocationBox] = useState(initialItem.location_box ?? "");
  const [notesInternal, setNotesInternal] = useState(initialItem.notes_internal ?? "");

  const [subcategory, setSubcategory] = useState(initialItem.subcategory ?? "");
  const [itemType, setItemType] = useState(initialItem.item_type ?? "");
  const [brand, setBrand] = useState(initialItem.brand ?? "");
  const [color, setColor] = useState(initialItem.color ?? "");
  const [material, setMaterial] = useState(initialItem.material ?? "");
  const [measurements, setMeasurements] = useState(initialItem.measurements ?? "");
  const [conditionNotes, setConditionNotes] = useState(initialItem.condition_notes ?? "");
  const [isFragile, setIsFragile] = useState(Boolean(initialItem.is_fragile));
  const [requiresMeasurement, setRequiresMeasurement] = useState(Boolean(initialItem.requires_measurement));

  const descLen = useMemo(() => description.length, [description]);
  const descColor = descLen > 320 ? "text-red-600" : descLen > 280 ? "text-amber-600" : "text-slate-500";
  const labelRecommendation = getLabelRecommendation({ category, sizeType, title, notesInternal });

  async function save() {
    setBusy(true);
    setOk(null);
    setError(null);

    try {
      const payload = {
        short_id: initialItem.short_id,
        title,
        description,
        category,
        condition,
        price,
        price_from: priceFrom || null,
        gender,
        age_group: ageGroup,
        season,
        size_type: sizeType,
        size_value: sizeValue || null,
        location_box: locationBox || null,
        notes_internal: notesInternal || null,
        subcategory: subcategory || null,
        item_type: itemType || null,
        brand: brand || null,
        color: color || null,
        material: material || null,
        measurements: measurements || null,
        condition_notes: conditionNotes || null,
        is_fragile: isFragile,
        requires_measurement: requiresMeasurement,
        label_template: labelRecommendation.code,
      };

      const resp = await fetch("/api/admin/update-item", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await resp.json();
      if (!resp.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Falha ao salvar";
        throw new Error(msg);
      }

      setOk("Salvo com sucesso.");
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const canEdit = initialItem.status === "review";

  return (
    <div className="rounded-2xl border bg-white p-5">
      <ContextHelp topic={ADMIN_HELP_TOPICS.editar} className="mb-4" />
      {!canEdit ? (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Este item não está mais em <b>Em revisão</b>. Por segurança, a edição fica bloqueada.
          Volte para <Link className="underline" href="/admin/itens">Itens</Link> e use os botões de status.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Ex.: Blusa feminina (verde)"
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Categoria</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Ex.: Roupas"
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[140px]"
          placeholder="Curto e direto (Instagramável)."
          disabled={!canEdit}
        />
        <div className={`mt-1 text-xs ${descColor}`}>
          {descLen}/320 <span className="text-slate-400">(ideal ~280)</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Estado</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            disabled={!canEdit}
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
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Preço de (opcional)</label>
          <input
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Ex.: 229,00"
            disabled={!canEdit}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Preço (por)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Ex.: 115,00"
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
        <div className="font-semibold mb-2">Classificação e tamanho</div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Sexo</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              disabled={!canEdit}
            >
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="unissex">Unissex</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Faixa etária</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              disabled={!canEdit}
            >
              <option value="infantil">Infantil</option>
              <option value="adolescente">Adolescente</option>
              <option value="adulto">Adulto</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Estação</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              disabled={!canEdit}
            >
              <option value="verao">Verão</option>
              <option value="inverno">Inverno</option>
              <option value="meia_estacao">Meia estação</option>
              <option value="todas">Todas</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          <div>
            <label className="text-sm font-medium">Tipo de tamanho</label>
            <select
              value={sizeType}
              onChange={(e) => setSizeType(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              disabled={!canEdit}
            >
              <option value="livre">Livre</option>
              <option value="roupa_letras">Roupa (PP/P/M/G/GG)</option>
              <option value="roupa_numero">Roupa (número)</option>
              <option value="calcado_br">Calçado (BR)</option>
              <option value="infantil_idade">Infantil (idade)</option>
              <option value="medidas_cm">Medidas (cm)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Valor do tamanho</label>
            <input
              value={sizeValue}
              onChange={(e) => setSizeValue(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: M / 38 / 25cm"
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>



      <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
        <div className="font-semibold mb-2">Dados operacionais do item</div>
        <p className="mb-3 text-sm text-slate-600">
          Estes campos ajudam a equipe a encontrar, etiquetar e descrever corretamente itens muito diferentes entre si.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Subcategoria</label>
            <input
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: Feminino / Casa"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo específico</label>
            <input
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: Vestido / Travessa"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Marca</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: Disney"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Cor principal</label>
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: Azul"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Material</label>
            <input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: algodão / vidro"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Medidas</label>
            <input
              value={measurements}
              onChange={(e) => setMeasurements(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex.: 20 x 15 cm"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Observações de condição</label>
          <input
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Ex.: pequeno risco na lateral"
            disabled={!canEdit}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <label className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2">
            <input
              type="checkbox"
              checked={isFragile}
              onChange={(e) => setIsFragile(e.target.checked)}
              disabled={!canEdit}
            />
            Item frágil
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2">
            <input
              type="checkbox"
              checked={requiresMeasurement}
              onChange={(e) => setRequiresMeasurement(e.target.checked)}
              disabled={!canEdit}
            />
            Exige medida/tamanho
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <div className="font-bold">Sugestão de etiqueta: {labelRecommendation.title}</div>
        <p className="mt-1">{labelRecommendation.description}</p>
        <p className="mt-1 text-emerald-800">{labelRecommendation.printHint}</p>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium">Observação (interna)</label>
        <input
          value={notesInternal}
          onChange={(e) => setNotesInternal(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="Ex.: pequena mancha (foto 3)"
          disabled={!canEdit}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canEdit || busy}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Salvando..." : "Salvar"}
        </button>

        <Link
          href={`/admin/ver/${encodeURIComponent(initialItem.short_id)}`}
          className="rounded-xl border bg-white px-4 py-2 font-semibold hover:bg-slate-50"
        >
          Ver (admin)
        </Link>
      </div>

      {ok ? <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{ok}</div> : null}
      {error ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
    </div>
  );
}
