export type LabelTemplateCode = "P" | "M" | "G" | "TAG" | "SAQUINHO" | "FRAGIL";

export type LabelTemplateSpec = {
  code: LabelTemplateCode;
  name: string;
  useFor: string;
  widthMm: number;
  heightMm: number;
  columns: number;
  rows: number;
};

export const LABEL_TEMPLATE_SPECS: Record<LabelTemplateCode, LabelTemplateSpec> = {
  P: { code: "P", name: "Etiqueta P", useFor: "Itens pequenos", widthMm: 38, heightMm: 21, columns: 3, rows: 8 },
  M: { code: "M", name: "Etiqueta M", useFor: "Itens padrão", widthMm: 63, heightMm: 38, columns: 2, rows: 6 },
  G: { code: "G", name: "Etiqueta G", useFor: "Calçados, caixas e kits", widthMm: 99, heightMm: 57, columns: 2, rows: 4 },
  TAG: { code: "TAG", name: "Tag pendurada", useFor: "Roupas", widthMm: 50, heightMm: 80, columns: 3, rows: 3 },
  SAQUINHO: { code: "SAQUINHO", name: "Etiqueta saquinho", useFor: "Bijuterias e peças pequenas", widthMm: 50, heightMm: 30, columns: 3, rows: 7 },
  FRAGIL: { code: "FRAGIL", name: "Etiqueta frágil", useFor: "Vidro, louça e cerâmica", widthMm: 70, heightMm: 45, columns: 2, rows: 5 },
};

export function normalizeLabelTemplateCode(value: unknown): LabelTemplateCode {
  const v = String(value ?? "M").trim().toUpperCase();
  if (v === "P" || v === "M" || v === "G" || v === "TAG" || v === "SAQUINHO" || v === "FRAGIL") return v;
  return "M";
}

export function getLabelTemplateSpec(value: unknown) {
  return LABEL_TEMPLATE_SPECS[normalizeLabelTemplateCode(value)];
}
