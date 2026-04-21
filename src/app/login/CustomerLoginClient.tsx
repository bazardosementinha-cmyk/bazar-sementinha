"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const ACCESS_KEY = "bazar_customer_access";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function CustomerLoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/meus-pedidos";

  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!whatsapp.trim()) {
      setError("Informe seu WhatsApp.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/public/orders/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(email),
          whatsapp: whatsapp.trim(),
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Não foi possível acessar seus pedidos.");

      localStorage.setItem(
        ACCESS_KEY,
        JSON.stringify({ email: normalizeEmail(email), whatsapp: whatsapp.trim() })
      );

      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao acessar seus pedidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Entrar para ver meus pedidos</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Use o mesmo e-mail e WhatsApp informados no checkout para consultar todos os seus pedidos.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">E-mail</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium">WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(DD) 9xxxx-xxxx"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="rounded-xl border bg-neutral-50 p-4 text-sm text-neutral-700">
          Por segurança, pedimos <b>e-mail + WhatsApp</b>. Assim o cliente consegue acessar todos os pedidos com praticidade, sem depender apenas de links individuais.
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="text-sm text-neutral-600">
        Ainda não comprou? <Link href="/" className="underline">Ir para o catálogo</Link>
      </div>
    </div>
  );
}
