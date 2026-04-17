"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro";
}

export default function LoginClient() {
  const sp = useSearchParams();

  // ✅ Pós-login padrão: lista de itens (home do admin)
  const next = sp.get("next") || "/admin/itens";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const resp = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json().catch(() => ({} as { error?: string }));
      if (!resp.ok) throw new Error(data?.error || "Falha ao autenticar");

      window.location.href = next;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">Admin - Login</h1>
        <p className="mt-1 text-sm text-slate-600">Acesso restrito (coordenadores/voluntários autorizados).</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Senha</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              type="password"
              required
            />
          </div>

          {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          Dica: crie os usuários no Supabase Auth e registre o papel (admin) em <code>profiles</code>.
        </div>
      </div>
    </div>
  );
}
