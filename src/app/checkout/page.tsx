"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = { short_id: string; title: string; price: number; status: string };
type CreateResp = { order_id: string; code: string; expires_at: string; total: number };

type CustomerDraft = {
  name: string;
  instagram: string; // sem @
  email: string | null;
  whatsapp: string | null;
  opt_in_marketing: boolean;
  saved_at: string;
};

const CUSTOMER_LS_KEY = "bazar_customer_v1";
const CART_LS_KEY = "bazar_cart";

function normalizeInstagram(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

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

function loadSavedCustomer(): CustomerDraft | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return null;
    const c = obj as Partial<CustomerDraft>;
    if (!c.name || !c.instagram) return null;
    return {
      name: String(c.name),
      instagram: String(c.instagram),
      email: c.email ? String(c.email) : null,
      whatsapp: c.whatsapp ? String(c.whatsapp) : null,
      opt_in_marketing: !!c.opt_in_marketing,
      saved_at: c.saved_at ? String(c.saved_at) : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function saveCustomerToLS(c: Omit<CustomerDraft, "saved_at">) {
  const payload: CustomerDraft = { ...c, saved_at: new Date().toISOString() };
  localStorage.setItem(CUSTOMER_LS_KEY, JSON.stringify(payload));
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

  const [savedCustomer, setSavedCustomer] = useState<CustomerDraft | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);

  useEffect(() => {
    const c = getCart();
    setIds(c);

    // Auto-preencher pelo que já foi salvo neste dispositivo
    const saved = loadSavedCustomer();
    setSavedCustomer(saved);
    if (saved) {
      setName(saved.name);
      setInstagram(saved.instagram ? `@${saved.instagram}` : "");
      setEmail(saved.email ?? "");
      setWhatsapp(saved.whatsapp ?? "");
      setOptIn(!!saved.opt_in_marketing);
    }
  }, []);

  // Se a pessoa digitar o @ e bater com o salvo, preenche automaticamente
  useEffect(() => {
    if (!savedCustomer) return;
    const ig = normalizeInstagram(instagram);
    if (ig && ig === savedCustomer.instagram) {
      setName(savedCustomer.name);
      setEmail(savedCustomer.email ?? "");
      setWhatsapp(savedCustomer.whatsapp ?? "");
      setOptIn(!!savedCustomer.opt_in_marketing);
    }
  }, [instagram, savedCustomer]);

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

  async function lookupCustomerByInstagram() {
    setLookupBusy(true);
    setLookupMsg(null);
    setErr(null);

    const ig = normalizeInstagram(instagram);
    if (!ig) {
      setLookupMsg("Informe seu @instagram primeiro.");
      setLookupBusy(false);
      return;
    }

    try {
      const resp = await fetch("/api/checkout/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instagram: ig }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setLookupMsg(data?.error || "Cliente não encontrado.");
        setLookupBusy(false);
        return;
      }

      const c = data.customer as { name: string; email: string | null; whatsapp: string | null; opt_in_marketing: boolean };
      setName(c.name || name);
      if (c.email) setEmail(c.email);
      if (c.whatsapp) setWhatsapp(c.whatsapp);
      setOptIn(!!c.opt_in_marketing);
      setLookupMsg("Dados preenchidos com base no cadastro anterior ✅");
    } catch {
      setLookupMsg("Falha ao buscar cadastro.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setErr(null);

    const ig = normalizeInstagram(instagram);
    if (!name.trim()) {
      setErr("Informe seu nome.");
      setBusy(false);
      return;
    }
    if (!ig) {
      setErr("Informe seu @instagram (sem ou com @).");
      setBusy(false);
      return;
    }
    if (!ids.length) {
      setErr("Carrinho vazio.");
      setBusy(false);
      return;
    }

    const payload = {
      cart_short_ids: ids,
      customer: {
        name: name.trim(),
        instagram: ig,
        email: email.trim() || null,
        whatsapp: whatsapp.trim() || null,
        opt_in_marketing: optIn,
      },
    };

    try {
      const resp = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao criar pedido");

      setOk(data as CreateResp);

      // Salva cadastro local para auto-preencher nas próximas compras
      saveCustomerToLS({
        name: payload.customer.name,
        instagram: payload.customer.instagram,
        email: payload.customer.email,
        whatsapp: payload.customer.whatsapp,
        opt_in_marketing: payload.customer.opt_in_marketing,
      });
      setSavedCustomer(loadSavedCustomer());

      // limpa carrinho
      setCart([]);
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
          <div>
            <b>Código:</b> {ok.code}
          </div>
          <div>
            <b>Total:</b> R$ {ok.total.toFixed(2).replace(".", ",")}
          </div>
          <div className="text-sm text-slate-600 mt-2">
            Você receberá as instruções de pagamento e retirada no Direct. Prazo: até{" "}
            <b>{new Date(ok.expires_at).toLocaleString()}</b>.
          </div>
        </div>
        <div className="mt-4">
          <Link className="underline" href="/">
            Voltar ao catálogo
          </Link>
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
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="font-semibold">Auto-preencher</div>
          <div className="mt-1 text-sm text-slate-600">
            Neste aparelho, salvamos seus dados após uma compra. Se você já comprou antes em outro aparelho, você pode tentar buscar pelo @instagram.
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const saved = loadSavedCustomer();
                setSavedCustomer(saved);
                if (saved) {
                  setName(saved.name);
                  setInstagram(saved.instagram ? `@${saved.instagram}` : "");
                  setEmail(saved.email ?? "");
                  setWhatsapp(saved.whatsapp ?? "");
                  setOptIn(!!saved.opt_in_marketing);
                  setLookupMsg("Dados preenchidos pelo histórico deste aparelho ✅");
                } else {
                  setLookupMsg("Nenhum cadastro salvo neste aparelho ainda.");
                }
              }}
              className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-100"
            >
              Preencher com dados salvos
            </button>

            <button
              type="button"
              disabled={lookupBusy}
              onClick={() => void lookupCustomerByInstagram()}
              className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
            >
              {lookupBusy ? "Buscando..." : "Buscar pelo @instagram"}
            </button>
          </div>

          {lookupMsg ? <div className="mt-2 text-sm text-slate-700">{lookupMsg}</div> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">@instagram (obrigatório)</label>
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
          <div className="text-sm text-slate-600 mt-1">
            Itens: {items.length} • Total: <b>R$ {total.toFixed(2).replace(".", ",")}</b>
          </div>
        </div>

        <button
          disabled={busy}
          onClick={submit}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Criando..." : "Criar pedido (reserva 24h)"}
        </button>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        <Link className="underline" href="/carrinho">
          Voltar ao carrinho
        </Link>
      </div>
    </div>
  );
}
