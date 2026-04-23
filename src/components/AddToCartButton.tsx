"use client";

import { useCallback, useEffect, useState } from "react";
import type { ItemStatus } from "@/lib/utils";

const CART_LS_KEY = "bazar_cart";

type Props = {
  shortId: string;
  disabled?: boolean;
  status?: ItemStatus;
};

function readInCart(shortId: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = localStorage.getItem(CART_LS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) && arr.includes(shortId);
  } catch {
    return false;
  }
}

export function AddToCartButton({ shortId, disabled, status }: Props) {
  const [busy, setBusy] = useState(false);
  const [inCart, setInCart] = useState(false);

  const isUnavailableByStatus = Boolean(status && status !== "available");

  useEffect(() => {
    setInCart(readInCart(shortId));
  }, [shortId]);

  const onClick = useCallback(() => {
    if (typeof window === "undefined") return;

    setBusy(true);
    try {
      const raw = localStorage.getItem(CART_LS_KEY);
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(arr)
        ? (arr.filter((x) => typeof x === "string") as string[])
        : [];

      if (!list.includes(shortId)) {
        list.push(shortId);
      }

      localStorage.setItem(CART_LS_KEY, JSON.stringify(list));
      setInCart(true);

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("bazar_cart_updated"));
    } finally {
      setBusy(false);
    }
  }, [shortId]);

  const isDisabled = Boolean(disabled) || busy || inCart || isUnavailableByStatus;
  const label = isUnavailableByStatus
    ? "Indisponível"
    : inCart
      ? "No carrinho"
      : "Adicionar ao carrinho";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={
        "rounded-lg px-3 py-2 text-sm font-medium border " +
        (isDisabled
          ? "bg-gray-100 text-gray-500 border-gray-200"
          : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800")
      }
      aria-label={label}
      title={label}
    >
      {label}
    </button>
  );
}

export default AddToCartButton;