import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import LegendPreview from "@/components/LegendPreview";

export const dynamic = "force-dynamic";

type Params = { shortId: string };

type ItemRow = {
  id: string;
  short_id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  condition: string | null;
  price: number | null;
  price_from: number | null;
  status: string | null;
  gender: string | null;
  age_group: string | null;
  season: string | null;
  size_type: string | null;
  size_value: string | null;
  location_box: string | null;
  notes_internal: string | null;
  sold_price: number | null;
  sold_price_final: number | null;
};

function fmtMoneyBR(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "-";
  return v.toFixed(2).replace(".", ",");
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


export default async function AdminVerItemPage({ params }: { params: Promise<Params> }) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect("/admin/login");

  const { shortId } = await params;

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("items")
    .select(
      "id,short_id,title,description,category,condition,price,price_from,status,gender,age_group,season,size_type,size_value,location_box,notes_internal,sold_price,sold_price_final"
    )
    .eq("short_id", shortId)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-bold">Erro ao carregar item</h1>
        <p className="mt-2 text-red-700 text-sm">{error.message}</p>
        <div className="mt-4">
          <Link className="underline" href="/admin/itens">
            Voltar para Itens
          </Link>
        </div>
      </div>
    );
  }

  const item = data as ItemRow | null;

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-bold">Item não encontrado</h1>
        <p className="mt-2 text-slate-600">Verifique o código do item e tente novamente.</p>
        <div className="mt-4">
          <Link className="underline" href="/admin/itens">
            Voltar para Itens
          </Link>
        </div>
      </div>
    );
  }

  const caption = buildCaption({
    title: item.title ?? "",
    condition: item.condition ?? "Muito bom",
    price: item.price,
    price_from: item.price_from,
    description: item.description,
    category: item.category ?? "Outros",
  });
  const hashtags = buildHashtags(item.category ?? "Outros");

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const publicUrl = base ? `${base}/i/${encodeURIComponent(item.short_id)}` : `/i/${encodeURIComponent(item.short_id)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Item #{item.short_id}</h1>
          <p className="mt-1 text-slate-600">{item.title ?? "Sem título"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/itens" className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
            Voltar
          </Link>
          <Link
            href={`/admin/editar/${encodeURIComponent(item.short_id)}`}
            className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
          >
            Editar
          </Link>
          <Link
            href={`/admin/qr/${encodeURIComponent(item.short_id)}`}
            className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
          >
            QR
          </Link>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Abrir (público)
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm font-semibold">Dados do item</div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium">{item.status ?? "-"}</dd>

            <dt className="text-slate-500">Categoria</dt>
            <dd className="font-medium">{item.category ?? "-"}</dd>

            <dt className="text-slate-500">Condição</dt>
            <dd className="font-medium">{item.condition ?? "-"}</dd>

            <dt className="text-slate-500">Preço (anunciado)</dt>
            <dd className="font-medium">R$ {fmtMoneyBR(item.price)}</dd>

            <dt className="text-slate-500">Preço de (opcional)</dt>
            <dd className="font-medium">R$ {fmtMoneyBR(item.price_from)}</dd>

            <dt className="text-slate-500">Sexo</dt>
            <dd className="font-medium">{item.gender ?? "-"}</dd>

            <dt className="text-slate-500">Faixa etária</dt>
            <dd className="font-medium">{item.age_group ?? "-"}</dd>

            <dt className="text-slate-500">Estação</dt>
            <dd className="font-medium">{item.season ?? "-"}</dd>

            <dt className="text-slate-500">Tamanho</dt>
            <dd className="font-medium">
              {(item.size_type ?? "-")}
              {item.size_value ? ` • ${item.size_value}` : ""}
            </dd>

            <dt className="text-slate-500">Local/caixa</dt>
            <dd className="font-medium">{item.location_box ?? "-"}</dd>

            <dt className="text-slate-500">Obs (interna)</dt>
            <dd className="font-medium">{item.notes_internal ?? "-"}</dd>

            <dt className="text-slate-500">Preço vendido (snapshot)</dt>
            <dd className="font-medium">R$ {fmtMoneyBR(item.sold_price)}</dd>

            <dt className="text-slate-500">Preço final vendido</dt>
            <dd className="font-medium">R$ {fmtMoneyBR(item.sold_price_final)}</dd>
          </dl>
        </div>

        <LegendPreview caption={caption} hashtags={hashtags} />
      </div>
    </div>
  );
}
