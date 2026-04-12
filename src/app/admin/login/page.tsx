"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";

function AdminLoginInner() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin/importar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    window.location.href = next;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">Admin - Login</h1>
        <p className="mt-1 text-sm text-slate-600">
          Acesso restrito (coordenadores/voluntários autorizados).
        </p>

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

          {error ? (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          Dica: crie os usuários no Supabase Auth e registre o papel (admin) em{" "}
          <code>profiles</code>.
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center px-4 text-slate-600">
          Carregando…
        </div>
      }
    >
      <AdminLoginInner />
    </Suspense>
  );
}