import Link from "next/link";
import AdminNavPills from "@/components/AdminNavPills";
import BatchLabelPrint from "@/components/BatchLabelPrint";
import ContextHelp from "@/components/ContextHelp";
import { ADMIN_HELP_TOPICS } from "@/lib/admin-help";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = { demo?: string };

export default async function AdminEtiquetasLotePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect("/admin/login");

  const params = await searchParams;
  const demoOnly = params.demo === "1" || params.demo === "true";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="no-print">
        <AdminNavPills />
      </div>

      <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Impressão de etiquetas em lote</h1>
          <p className="mt-1 max-w-3xl text-slate-600">
            Selecione itens por categoria/modelo e imprima várias etiquetas de uma vez. Use o catálogo demo para apresentar a funcionalidade aos coordenadores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/catalogo-demo" className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
            Catálogo demo
          </Link>
          <Link href="/admin/manual#etiquetas-lote" className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
            Ver regras
          </Link>
        </div>
      </div>

      <div className="no-print">
        <ContextHelp topic={ADMIN_HELP_TOPICS.etiquetasLote} className="mt-4" />
      </div>

      <div className="mt-6">
        <BatchLabelPrint demoOnly={demoOnly} siteUrl={siteUrl} />
      </div>
    </div>
  );
}
