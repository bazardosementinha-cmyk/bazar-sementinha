"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = { short_id: string; title: string; price: number; status: string };
type CreateResp = { order_id: string; code: string; expires_at: string; total: number };

type OrderStatus = "reserved" | "paid" | "delivered" | "canceled";
type PayMode = "pix_total" | "cartao_retirada_deposito10" | "pagar_na_retirada";

type CustomerDraft = {
  name: string;
  whatsapp: string;
  email: string | null;
  opt_in_marketing: boolean;
  saved_at: string;
};

const CUSTOMER_LS_KEY = "bazar_customer_v2";
const CART_LS_KEY = "bazar_cart";

const WHATSAPP_SUPPORT_E164 = "5519992360856"; // +55 19 99236-0856
const PIX_KEY = "58.392.598/0001-91";
const PIX_BENEFICIARY = "Templo de Umbanda Caboclo Sete Flexa";

function digitsOnly(s: string): string {
  return (s || "").replace(/\D+/g, "");
}

function formatWhatsappE164Br(raw: string): string {
  const d = digitsOnly(raw);
  if (!d) return "";
  if (d.startsWith("55")) return d;
  return `55${d}`;
}

function waLink(phoneE164: string, text: string): string {
  const p = digitsOnly(phoneE164);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getApiError(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const e = data.error;
  return typeof e === "string" ? e : null;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
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

    const o = obj as Partial<Record<string, unknown>>;
    const name = typeof o.name === "string" ? o.name : "";
    const whatsapp = typeof o.whatsapp === "string" ? o.whatsapp : "";

    return {
      name,
      whatsapp,
      email: typeof o.email === "string" ? o.email : null,
      opt_in_marketing: typeof o.opt_in_marketing === "boolean" ? o.opt_in_marketing : false,
      saved_at: typeof o.saved_at === "string" ? o.saved_at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function saveCustomer(c: Omit<CustomerDraft, "saved_at">) {
  const payload: CustomerDraft = { ...c, saved_at: new Date().toISOString() };
  localStorage.setItem(CUSTOMER_LS_KEY, JSON.stringify(payload));
}

async function fetchCartItems(ids: string[]): Promise<Item[]> {
  if (!ids.length) return [];
  const res = await fetch(`/api/public/items?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.filter((x) => x && typeof x === "object") as Item[];
}

function formatBRL(v: number): string {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

export default function CheckoutPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);

  const [payMode, setPayMode] = useState<PayMode>("pix_total");
  const [created, setCreated] = useState<CreateResp | null>(null);

  const [snapshotItems, setSnapshotItems] = useState<Item[]>([]);

  useEffect(() => {
    const current = getCart();
    const params = new URLSearchParams(window.location.search);
    const buy = (params.get("buy") || "").trim().replace(/^#/, "");
    const next = buy && !current.includes(buy) ? [buy, ...current] : current;

    if (next !== current) setCart(next);
    setIds(next);

    const saved = loadSavedCustomer();
    if (saved) {
      setName(saved.name);
      setWhatsapp(saved.whatsapp);
      setEmail(saved.email ?? "");
      setOptIn(saved.opt_in_marketing);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchCartItems(ids);
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const total = useMemo(() => items.reduce((acc, it) => acc + (Number(it.price) || 0), 0), [items]);
  const availableItems = useMemo(() => items.filter((it) => it.status === "available"), [items]);

  const canCreate = useMemo(() => {
    const hasItems = availableItems.length > 0;
    const hasName = name.trim().length >= 2;
    const hasWhatsapp = digitsOnly(whatsapp).length >= 10;
    return hasItems && hasName && hasWhatsapp;
  }, [availableItems.length, name, whatsapp]);

  async function load() {
    setError(null);
    setRefreshing(true);
    try {
      const data = await fetchCartItems(ids);
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreate() {
    setError(null);
    setCreated(null);

    const whatsappE164 = formatWhatsappE164Br(whatsapp);
    if (!whatsappE164) {
      setError("Informe um WhatsApp válido (com DDD).");
      return;
    }

    setRefreshing(true);
    try {
      const resp = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_short_ids: availableItems.map((x) => x.short_id),
          customer: {
            name: name.trim(),
            whatsapp: whatsappE164,
            email: email.trim() ? email.trim() : null,
            opt_in_marketing: !!optIn,
          },
          pay_mode: payMode,
        }),
      });

      const data: unknown = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const message = getApiError(data) ?? "Falha ao criar pedido";
        throw new Error(message);
      }

      const createdResp = data as CreateResp;

      saveCustomer({
        name: name.trim(),
        whatsapp: whatsappE164,
        email: email.trim() ? email.trim() : null,
        opt_in_marketing: !!optIn,
      });

      setSnapshotItems(availableItems);

      setCart([]);
      setIds([]);
      setItems([]);

      setCreated(createdResp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setRefreshing(false);
    }
  }

  if (created) {
    const totalTxt = formatBRL(created.total);
    const lines: string[] = [];
    lines.push(`Olá! Fiz um pedido no Bazar do Sementinha.`);
    lines.push(`Pedido: ${created.code}`);
    lines.push(`Total: ${totalTxt}`);
    lines.push("");
    lines.push(`Chave PIX (CNPJ): ${PIX_KEY} — ${PIX_BENEFICIARY}`);
    lines.push("Vou enviar o comprovante por aqui.");
    const msg = lines.join("\n");
    const wa = waLink(WHATSAPP_SUPPORT_E164, msg);

    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Pedido criado ✅</h1>

        <div className="mt-6 rounded-xl border bg-white p-5">
          <div className="text-sm text-gray-600">Código</div>
          <div className="font-mono text-xl font-semibold">{created.code}</div>
          <div className="mt-2 text-sm text-gray-600">
            Total: <b>{totalTxt}</b>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Retirada no <b>TUCXA2</b> (Rua Francisco de Assis Pupo, 390 - Vila Industrial - Campinas/SP) conforme combinado.
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Pagamento / Comprovante</h2>
          <div className="mt-2 text-sm text-gray-700">
            Chave Pix (CNPJ): <span className="font-mono">{PIX_KEY}</span> — {PIX_BENEFICIARY}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => void copyText(PIX_KEY)}
            >
              Copiar chave Pix
            </button>

            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Abrir WhatsApp e enviar comprovante
            </a>

            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => void copyText(msg)}
            >
              Copiar mensagem
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Itens:
            <ul className="mt-1 list-disc pl-5">
              {snapshotItems.map((it) => (
                <li key={it.short_id}>
                  #{it.short_id} — {it.title} ({formatBRL(Number(it.price) || 0)})
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
            Continuar comprando
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Finalizar pedido</h1>
      <p className="mt-2 text-sm text-gray-600">
        Atendimento e confirmação pelo <b>WhatsApp</b>.
      </p>

      {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Itens</h2>
          <button
            type="button"
            className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
            onClick={load}
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {availableItems.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Seu carrinho está vazio (ou não há itens disponíveis).</p>
        ) : (
          <div className="mt-3 space-y-3">
            {availableItems.map((it) => (
              <div key={it.short_id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{it.title}</div>
                  <div className="text-sm text-gray-600">#{it.short_id}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold">{formatBRL(Number(it.price) || 0)}</div>
                  <button
                    type="button"
                    className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
                    onClick={() => {
                      const next = ids.filter((x) => x !== it.short_id);
                      setCart(next);
                      setIds(next);
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-xl font-semibold">{formatBRL(total)}</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Seus dados</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 font-medium">Nome</div>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 font-medium">WhatsApp (obrigatório)</div>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(DD) 9xxxx-xxxx"
              inputMode="tel"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            <div className="mb-1 font-medium">Email (opcional)</div>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              inputMode="email"
            />
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
          Quero receber novidades e promoções (opcional).
        </label>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Pagamento</h2>

        <div className="mt-3 space-y-2 text-sm">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="payMode"
              checked={payMode === "pix_total"}
              onChange={() => setPayMode("pix_total")}
            />
            <div>
              <div className="font-medium">Pix agora (valor total)</div>
              <div className="text-gray-600">Envie o comprovante no WhatsApp após criar o pedido.</div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="payMode"
              checked={payMode === "cartao_retirada_deposito10"}
              onChange={() => setPayMode("cartao_retirada_deposito10")}
            />
            <div>
              <div className="font-medium">Cartão na retirada (Pix R$ 10,00 para reservar)</div>
              <div className="text-gray-600">Pix de R$ 10,00 é devolvido na retirada/pagamento. Prazo máximo 15 dias.</div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="payMode"
              checked={payMode === "pagar_na_retirada"}
              onChange={() => setPayMode("pagar_na_retirada")}
            />
            <div>
              <div className="font-medium">Pagar na retirada (Pix ou cartão)</div>
              <div className="text-gray-600">Se não pagar em 24h, o pedido é cancelado automaticamente.</div>
            </div>
          </label>
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <div className="font-medium">Chave Pix (CNPJ)</div>
          <div className="mt-1 font-mono">{PIX_KEY}</div>
          <div className="mt-1 text-gray-600">{PIX_BENEFICIARY}</div>
          <div className="mt-2">
            <button
              type="button"
              className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => void copyText(PIX_KEY)}
            >
              Copiar chave Pix
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!canCreate || refreshing}
          onClick={() => void handleCreate()}
        >
          {refreshing ? "Criando..." : "Criar pedido"}
        </button>

        <Link href="/" className="rounded-lg border px-4 py-3 text-sm hover:bg-gray-50">
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}