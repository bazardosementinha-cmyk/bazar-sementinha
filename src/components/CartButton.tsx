"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

function readCartCount(): number {
  try {
    const raw = localStorage.getItem("bazar_cart");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return 0;
    return arr.filter((x) => typeof x === "string").length;
  } catch {
    return 0;
  }
}

export function CartButton() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (isAdmin) return;

    const update = () => setCount(readCartCount());
    update();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "bazar_cart") update();
    };

    const onCustom = () => update();

    window.addEventListener("storage", onStorage);
    window.addEventListener("bazar_cart_updated", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("bazar_cart_updated", onCustom as EventListener);
    };
  }, [isAdmin]);

  const label = useMemo(() => `Carrinho (${count})`, [count]);

  if (isAdmin) return null;

  return (
    <Link
      href="/carrinho"
      className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
      title="Abrir carrinho"
    >
      {label}
    </Link>
  );
}
