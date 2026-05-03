import Link from "next/link";
import { Shell, TopBar } from "@/components/Shell";
import CustomerLoginClient from "./CustomerLoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <TopBar />
      <Shell>
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Colabore com o Sementinha</div>
            <h1 className="mt-2 text-2xl font-bold">Acompanhe seus pedidos ou escolha novos itens.</h1>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              Cada reserva ajuda a manter o bazar organizado e transforma itens em apoio real para as ações do Sementinha.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Contribuir agora
            </Link>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Administração</div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Acesso dos administradores</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Coordenadores e equipe do bazar devem entrar pela área administrativa para gerenciar itens, pedidos, comprovantes e etiquetas.
            </p>
            <Link
              href="/admin/login"
              className="mt-4 inline-flex rounded-full border bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Entrar como administrador
            </Link>
          </div>
        </div>

        <CustomerLoginClient />
      </Shell>
    </>
  );
}
