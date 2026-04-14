"use client";

import { useEffect, useMemo, useState } from "react";

function readCart(): string[] {
  try {
    const raw = localStorage.getItem("bazar_cart");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function writeCart(ids: string[]) {
  localStorage.setItem("bazar_cart", JSON.stringify(ids));
  window.dispatchEvent(new Event("bazar_cart_updated"));
}

export function AddToCartButton({
  shortId,
  disabled,
}: {
  shortId: string;
  disabled?: boolean;
}) {
  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    const ids = readCart();
    setInCart(ids.includes(shortId));
  }, [shortId]);

  const label = useMemo(() => {
    if (disabled) return "Indisponível";
    if (inCart) return "Já está no carrinho";
    return "Adicionar ao carrinho";
  }, [disabled, inCart]);

  function onClick() {
    if (disabled) return;
    const ids = readCart();
    if (!ids.includes(shortId)) {
      ids.unshift(shortId);
      writeCart(ids);
      setInCart(true);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || inCart}
      className={
        disabled || inCart
          ? "rounded-2xl border bg-white px-4 py-3 text-center font-semibold text-slate-400"
          : "rounded-2xl bg-slate-900 px-4 py-3 text-center font-semibold text-white hover:bg-black"
      }
    >
      {label}
    </button>
  );
}
