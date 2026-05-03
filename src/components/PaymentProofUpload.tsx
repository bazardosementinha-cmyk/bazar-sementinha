"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

const MAX_MB = 8;

export type PaymentProofUploadProps = {
  code: string;
  token?: string;
  contact?: string;
  disabled?: boolean;
  onUploaded?: () => void | Promise<void>;
};

export default function PaymentProofUpload({ code, token, contact, disabled, onUploaded }: PaymentProofUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      setFile(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(selected.type)) {
      setFile(null);
      setError("Formato inválido. Envie JPG, PNG, WEBP ou PDF.");
      return;
    }

    if (selected.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setError(`Arquivo muito grande. Limite: ${MAX_MB} MB.`);
      return;
    }

    setFile(selected);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Selecione o comprovante antes de enviar.");
      return;
    }

    const formData = new FormData();
    formData.set("code", code);
    if (token) formData.set("token", token);
    if (contact) {
      if (contact.includes("@")) formData.set("email", contact.trim());
      else formData.set("whatsapp", contact.trim());
    }
    formData.set("file", file);

    setBusy(true);
    try {
      const res = await fetch("/api/public/orders/upload-payment-proof", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Não foi possível enviar o comprovante.");
      }

      setSuccess("Comprovante enviado com sucesso. A equipe fará a conferência antes de confirmar o pagamento.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar comprovante.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="font-semibold text-emerald-950">Enviar comprovante do Pix</div>
      <p className="mt-1 text-sm text-emerald-900">
        Após pagar o Pix, envie o comprovante aqui. O pedido ficará como <strong>Comprovante enviado</strong> até a conferência da equipe.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label className="text-sm font-medium text-emerald-950">Arquivo do comprovante</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={disabled || busy}
            onChange={onFileChange}
            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-60"
          />
          <p className="mt-1 text-xs text-emerald-800">Formatos aceitos: JPG, PNG, WEBP ou PDF. Limite: {MAX_MB} MB.</p>
        </div>

        <button
          type="submit"
          disabled={disabled || busy || !file}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Enviar comprovante"}
        </button>
      </div>

      {file ? <div className="mt-2 text-xs text-emerald-900">Selecionado: {file.name}</div> : null}
      {error ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {success ? <div className="mt-3 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-800">{success}</div> : null}
    </form>
  );
}
