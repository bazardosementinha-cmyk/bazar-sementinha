import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-5xl px-4 py-6", className)}>{children}</div>;
}

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 border-b bg-[#faf7f2]/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 min-w-0">
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
            <div className="font-semibold text-[#ac5936] truncate">Bazar do Sementinha</div>
            <div className="text-xs text-[#0a858a] truncate">Catálogo • Retirada no TUCXA2</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">{right}</div>
      </div>
    </div>
  );
}