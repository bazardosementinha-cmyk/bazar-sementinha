"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function pillClass(active: boolean) {
  return active
    ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-sm font-semibold text-white"
    : "rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50";
}

export default function AdminNavPills() {
  const pathname = usePathname();

  const isItens = pathname?.startsWith("/admin/itens");
  const isPedidos = pathname?.startsWith("/admin/pedidos");
  const isRelatorio = pathname?.startsWith("/admin/relatorio");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/admin/itens" className={pillClass(!!isItens)}>
        Itens
      </Link>
      <Link href="/admin/pedidos" className={pillClass(!!isPedidos)}>
        Pedidos
      </Link>
      <Link href="/admin/relatorio" className={pillClass(!!isRelatorio)}>
        Relatório
      </Link>
    </div>
  );
}
