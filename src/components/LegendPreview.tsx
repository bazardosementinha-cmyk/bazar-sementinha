"use client";

import { useMemo, useState } from "react";

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

export default function LegendPreview(props: { caption: string; hashtags?: string; hint?: string }) {
  const { caption, hashtags, hint } = props;
  const [copied, setCopied] = useState(false);

  const full = useMemo(() => {
    const h = (hashtags || "").trim();
    return h ? `${caption}\n\n${h}` : caption;
  }, [caption, hashtags]);

  const chars = caption.length;

  async function onCopy() {
    const ok = await copyToClipboard(full);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Preview (Instagram)</div>
          <div className="text-xs text-slate-500">{hint || "Texto curto e direto (auto-limitado)."}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500">{chars} chars</div>
          <button
            type="button"
            onClick={() => void onCopy()}
            className="rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-50"
            title="Copia o texto + hashtags"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border bg-slate-50 p-4">
        <pre className="whitespace-pre-wrap text-sm text-slate-800">{caption}</pre>
      </div>

      {hashtags ? <div className="mt-3 text-xs text-slate-500">Ao copiar, a legenda vai com hashtags.</div> : null}
    </div>
  );
}
