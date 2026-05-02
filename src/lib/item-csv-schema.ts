export const ITEM_CSV_HEADERS = [
  "title",
  "description",
  "category",
  "subcategory",
  "item_type",
  "condition",
  "price",
  "price_from",
  "gender",
  "age_group",
  "season",
  "size_type",
  "size_value",
  "brand",
  "color",
  "material",
  "measurements",
  "is_fragile",
  "requires_measurement",
  "label_template",
  "location_box",
  "condition_notes",
  "notes_internal",
] as const;

export const LEGACY_ITEM_CSV_HEADERS = [
  "title",
  "description",
  "category",
  "condition",
  "price",
  "price_from",
  "gender",
  "age_group",
  "season",
  "size_type",
  "size_value",
  "location_box",
  "notes_internal",
] as const;

export type ItemCsvHeader = (typeof ITEM_CSV_HEADERS)[number];
export type ItemCsvRow = Partial<Record<ItemCsvHeader, string>> & Record<string, string | undefined>;

export const ITEM_CSV_HEADER_LINE = ITEM_CSV_HEADERS.join(";");

export const ITEM_CSV_ALLOWED_VALUES = {
  category: ["Roupas", "Calcados", "Acessorios", "Casa", "Brinquedos", "Artesanato", "Outros"],
  condition: ["Novo", "Muito bom", "Bom", "Regular"],
  gender: ["feminino", "masculino", "unissex", ""],
  age_group: ["infantil", "adolescente", "adulto", ""],
  season: ["verao", "inverno", "meia_estacao", "todas", ""],
  size_type: ["livre", "roupa_letras", "roupa_numero", "calcado_br", "infantil_idade", "medidas_cm"],
  label_template: ["P", "M", "G", "TAG", "SAQUINHO", "FRAGIL", ""],
} as const;

export function parseBooleanLike(value: string | null | undefined): boolean | null {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (["true", "1", "sim", "s", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "nao", "n", "no"].includes(normalized)) return false;
  return null;
}

export function booleanToCsvValue(value: boolean | null | undefined): "sim" | "nao" | "" {
  if (value === true) return "sim";
  if (value === false) return "nao";
  return "";
}

export function normalizeLabelTemplate(value: string | null | undefined): string {
  const v = (value ?? "").trim().toUpperCase();
  if (["P", "M", "G", "TAG", "SAQUINHO", "FRAGIL"].includes(v)) return v;
  return "";
}
