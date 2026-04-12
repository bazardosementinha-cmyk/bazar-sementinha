"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = { short_id: string; title: string; price: number; status: string };
type CreateResp = { order_id: string; code: string; expires_at: string; total: number };

function getCart(): string[] {
  try {
    const raw = localStorage.getItem("bazar_cart");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function setCart(ids: string[]) {
  localStorage.setItem("bazar_cart", JSON.stringify(ids));
}

export default function CheckoutPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<CreateResp | null>(null);

  // Cliente
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [optIn, setOptIn] = useState(false);

  useEffect(() => {
    const c = getCart();
    setIds(c);
  }, []);

  useEffect(() => {
    async function load() {
      setErr(null);
      if (!ids.length) return;
      const resp = await fetch(`/api/public/items?short_ids=${encodeURIComponent(ids.join(","))}`);
      const data = await resp.json();
      if (!resp.ok) {
        setErr(data?.error || "Falha ao carregar itens");
        return;
      }
      setItems((data.items ?? []) as Item[]);
    }
    void load();
  }, [ids]);

  const total = useMemo(() => items.reduce((s, i) => s + Number(i.price ?? 0), 0), [items]);

  async function submit() {
    setBusy(true);
    setErr(null);

    const ig = instagram.trim().replace(/^@/, "");
    if (!name.trim()) { setErr("Informe seu nome."); setBusy(false); return; }
    if (!ig) { setErr("Informe seu @instagram (sem ou com @)."); setBusy(false); return; }
    if (!ids.length) { setErr("Carrinho vazio."); setBusy(false); return; }

    try {
      const resp = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_short_ids: ids,
          customer: { name: name.trim(), instagram: ig, email: email.trim() || null, whatsapp: whatsapp.trim() || null, opt_in_marketing: optIn },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao criar pedido");

      setOk(data as CreateResp);
      setCart([]); // limpa carrinho
      setIds([]);
      setItems([]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  if (ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Pedido criado ✅</h1>
        <div className="mt-4 rounded-2xl border bg-white p-5">
          <div><b>Código:</b> {ok.code}</div>
          <div><b>Total:</b> R$ {ok.total.toFixed(2).replace(".", ",")}</div>
          <div className="text-sm text-slate-600 mt-2">
            Você receberá as instruções de pagamento e retirada no Direct. Prazo: até <b>{new Date(ok.expires_at).toLocaleString()}</b>.
          </div>
        </div>
        <div className="mt-4">
          <Link className="underline" href="/">Voltar ao catálogo</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">Finalizar pedido</h1>
      <p className="mt-1 text-slate-600">Informe seus dados para atendimento no Direct. Promoções só com consentimento.</p>

      {err ? <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

      <div className="mt-4 rounded-2xl border bg-white p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">@instagram</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuusuario" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Email (opcional)</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">WhatsApp (opcional)</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(DD) 9xxxx-xxxx" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
          Quero receber novidades e promoções (opcional).
        </label>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="font-semibold">Resumo</div>
          <div className="text-sm text-slate-600 mt-1">Itens: {items.length} • Total: <b>R$ {total.toFixed(2).replace(".", ",")}</b></div>
        </div>

        <button
          disabled={busy}
          onClick={submit}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Criando..." : "Criar pedido (reserva 24h)"}
        </button>
      </div>
    </div>
  );
}