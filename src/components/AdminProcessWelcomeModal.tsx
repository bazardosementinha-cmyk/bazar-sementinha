"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "bazar-process-welcome-dismissed-v1";

export default function AdminProcessWelcomeModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      setVisible(dismissed !== "true");
    } catch {
      setVisible(true);
    }
  }, []);

  function closeForSession() {
    setVisible(false);
  }

  function neverShowAgain() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Se localStorage falhar, apenas fecha nesta sessão.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
          Processo essencial do Bazar Online
        </div>

        <h2 className="mt-4 text-2xl font-bold text-slate-950">A identificação correta dos itens faz o aplicativo funcionar.</h2>

        <p className="mt-3 text-slate-700">
          Cada produto precisa ter cadastro, fotos, categoria, preço, localização física e etiqueta/QR coerentes.
          Esse cuidado evita item perdido, venda com informação errada, retrabalho na separação e dúvida na retirada.
        </p>

        <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
          <div className="font-semibold">Regra de ouro</div>
          <p className="mt-1 text-sm text-slate-600">
            Produto só deve ser publicado quando estiver revisado, identificado fisicamente e guardado no local informado no sistema.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={closeForSession}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Entendi, continuar
          </button>

          <Link
            href="/admin/manual"
            onClick={closeForSession}
            className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Ver manual do processo
          </Link>

          <button
            type="button"
            onClick={neverShowAgain}
            className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Não mostrar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
