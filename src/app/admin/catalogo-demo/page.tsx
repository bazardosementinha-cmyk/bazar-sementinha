import Link from "next/link";
import AdminNavPills from "@/components/AdminNavPills";
import DemoCatalogPreview from "@/components/DemoCatalogPreview";
import ContextHelp from "@/components/ContextHelp";
import { ADMIN_HELP_TOPICS } from "@/lib/admin-help";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCatalogoDemoPage() {
  const gate = await requireAdmin();
  if (!gate.ok) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <AdminNavPills />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo demo</h1>
          <p className="mt-1 max-w-3xl text-slate-600">
            Ambiente de demonstração para coordenadores: exemplos de categorias, fotos ilustrativas, localização física, etiquetas e impressão em lote, sem aparecer na loja pública.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/etiquetas/lote?demo=1" className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
            Etiquetas em lote
          </Link>
          <Link href="/admin/manual#catalogo-demo" className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
            Ver regras
          </Link>
        </div>
      </div>

      <ContextHelp topic={ADMIN_HELP_TOPICS.catalogoDemo} className="mt-4" />

      <div className="mt-4 rounded-2xl border bg-white p-5">
        <form action="/api/admin/demo-catalog" method="post" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold">Seed do catálogo demo</div>
            <p className="mt-1 text-sm text-slate-600">
              Rode uma vez para criar/atualizar os itens demo no banco. Eles ficam marcados como demo e são bloqueados nas consultas públicas.
            </p>
          </div>
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" type="submit">
            Criar/atualizar demo
          </button>
        </form>
      </div>

      <div className="mt-6">
        <DemoCatalogPreview />
      </div>
    </div>
  );
}
