import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CartButton } from "@/components/CartButton";

export function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-5xl px-4 py-6", className)}>{children}</div>;
}

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-20 border-b bg-[#faf7f2]/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/brand/logo-sementinha.jpg"
            alt="Bazar do Sementinha"
            width={36}
            height={36}
            priority
            className="rounded-full ring-1 ring-black/5"
            style={{ filter: "hue-rotate(60deg) saturate(1.2)" }}
          />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-semibold text-[#ac5936]">Bazar do Sementinha</div>
            <div className="truncate text-xs text-[#0a858a]">Catálogo • Retirada no TUCXA2</div>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/meus-pedidos" className="rounded-full border bg-white px-2.5 py-2 text-xs font-medium hover:bg-neutral-50 sm:px-4 sm:text-sm">
            Meus pedidos
          </Link>
          <CartButton />
          <Link
            href="/admin/login"
            className="rounded-full border bg-white px-2.5 py-2 text-xs font-medium hover:bg-neutral-50 sm:px-4 sm:text-sm"
            title="Acessar gestão"
          >
            <span>Gestão</span>
          </Link>
          {right}
        </div>
      </div>
    </div>
  );
}
