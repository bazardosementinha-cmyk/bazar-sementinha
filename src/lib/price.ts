function parseMoneyBR(raw: string): number | null {
  // Accept: "229", "229,00", "1.299,90"
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function extractPricesFromCaption(caption: string): { price?: number; price_from?: number } {
  const text = caption.replace(/\s+/g, " ");

  const out: { price?: number; price_from?: number } = {};

  // Pattern: de R$ 229,00 por R$ 115,00
  const reDePor = /de\s*R\$\s*([0-9\.\,]+)\s*por\s*R\$\s*([0-9\.\,]+)/i;
  const m1 = text.match(reDePor);
  if (m1) {
    const price_from = parseMoneyBR(m1[1]);
    const price = parseMoneyBR(m1[2]);
    if (price_from != null) out.price_from = price_from;
    if (price != null) out.price = price;
    return out;
  }

  // Pattern: Valor: R$115,00  OR  por R$115,00
  const reValor = /(valor|por)\s*:\s*R\$\s*([0-9\.\,]+)/i;
  const m2 = text.match(reValor);
  if (m2) {
    const price = parseMoneyBR(m2[2]);
    if (price != null) out.price = price;
    return out;
  }

  // Any R$ number (take last occurrence as current price)
  const reAny = /R\$\s*([0-9\.\,]+)/gi;
  const all = [...text.matchAll(reAny)];
  if (all.length) {
    const last = all[all.length - 1][1];
    const price = parseMoneyBR(last);
    if (price != null) out.price = price;
  }

  return out;
}