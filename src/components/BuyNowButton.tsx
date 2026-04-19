"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function readCartIds(): string[] {
  try {
    const raw = localStorage.getItem("bazar_cart");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

function writeCartIds(ids: string[]) {
  localStorage.setItem("bazar_cart", JSON.stringify(ids));
}

export function BuyNowButton({ shortId, disabled }: { shortId: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = () => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const current = readCartIds();
      const next = Array.from(new Set([shortId, ...current]));
      writeCartIds(next);
      // Dica: `buy` ajuda o checkout a garantir que o item entrou no carrinho.
      router.push(`/checkout?buy=${encodeURIComponent(shortId)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`rounded-2xl px-4 py-3 text-center font-semibold ${
        disabled ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white hover:bg-slate-800"
      }`}
      aria-disabled={disabled || busy}
    >
      Comprar agora
    </button>
  );
}
