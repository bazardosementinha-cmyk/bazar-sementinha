import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import EditForm from "./EditForm";

export const dynamic = "force-dynamic";

type Params = { shortId: string };

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
};

export default async function AdminEditarItemPage({ params }: { params: Promise<Params> }) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect("/admin/login");

  const { shortId } = await params;

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("items")
    .select(
      "short_id,status,title,description,category,condition,price,price_from,gender,age_group,season,size_type,size_value,location_box,notes_internal"
    )
    .eq("short_id", shortId)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-bold">Erro ao carregar item</h1>
        <p className="mt-2 text-sm text-red-700">{error.message}</p>
        <div className="mt-4">
          <Link className="underline" href="/admin/itens">Voltar para Itens</Link>
        </div>
      </div>
    );
  }

  const item = data as ItemRow | null;

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-bold">Item não encontrado</h1>
        <p className="mt-2 text-slate-600">Verifique o código e tente novamente.</p>
        <div className="mt-4">
          <Link className="underline" href="/admin/itens">Voltar para Itens</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Editar item #{item.short_id}</h1>
          <p className="mt-1 text-slate-600">
            Ajuste os campos antes de publicar. Regra: edição só funciona enquanto estiver em <b>Em revisão</b>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/ver/${encodeURIComponent(item.short_id)}`}
            className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
          >
            Ver (admin)
          </Link>
          <Link
            href="/admin/itens"
            className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
          >
            Voltar
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <EditForm initialItem={item} />
      </div>
    </div>
  );
}
