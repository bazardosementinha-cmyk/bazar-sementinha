import Link from "next/link";
import { TopBar } from "@/components/Shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar
        right={
          <div className="flex items-center gap-3 text-sm">
            <Link href="/admin/importar" className="text-slate-600 hover:text-slate-900">Importar</Link>
            <Link href="/admin/itens" className="text-slate-600 hover:text-slate-900">Itens</Link>
            <Link href="/admin/relatorio" className="text-slate-600 hover:text-slate-900">Relatório</Link>
            <form action="/api/admin/logout" method="post">
              <button className="rounded-full border bg-white px-3 py-1 hover:bg-slate-50">Sair</button>
            </form>
          </div>
        }
      />
      {children}
    </>
  );
}
