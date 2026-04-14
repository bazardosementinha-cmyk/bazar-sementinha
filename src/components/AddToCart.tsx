"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const CART_LS_KEY = "bazar_cart";

function getCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_LS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function setCart(ids: string[]) {
  localStorage.setItem(CART_LS_KEY, JSON.stringify(ids));
}

export function AddToCartButton(props: { shortId: string; disabled?: boolean }) {
  const { shortId, disabled } = props;
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getCart());
  }, []);

  const inCart = useMemo(() => ids.includes(shortId), [ids, shortId]);

  function add() {
    const next = Array.from(new Set([...ids, shortId]));
    setIds(next);
    setCart(next);
  }

  function remove() {
    const next = ids.filter((x) => x !== shortId);
    setIds(next);
    setCart(next);
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        disabled={!!disabled}
        onClick={inCart ? remove : add}
        className="rounded-2xl bg-slate-900 px-4 py-3 text-center font-semibold text-white hover:bg-black disabled:opacity-60"
      >
        {inCart ? "Remover do carrinho" : "Adicionar ao carrinho"}
      </button>

      <Link href="/carrinho" className="rounded-2xl border bg-white px-4 py-3 text-center font-semibold hover:bg-slate-50">
        Ir para o carrinho
      </Link>
    </div>
  );
}
