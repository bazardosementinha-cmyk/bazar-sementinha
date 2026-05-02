import { ITEM_CSV_HEADERS, parseBooleanLike, normalizeLabelTemplate, type ItemCsvRow } from "@/lib/item-csv-schema";

export type NormalizedItemCsv = {
  values: ItemCsvRow;
  warnings: string[];
};

function normalizeWhitespace(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeItemCsvRow(row: Record<string, string | undefined>): NormalizedItemCsv {
  const warnings: string[] = [];
  const values: ItemCsvRow = {};

  for (const key of ITEM_CSV_HEADERS) {
    values[key] = normalizeWhitespace(row[key]);
  }

  const fragile = parseBooleanLike(values.is_fragile);
  if (values.is_fragile && fragile == null) warnings.push("is_fragile deve ser sim/nao; valor mantido para revisão.");
  else values.is_fragile = fragile == null ? "" : fragile ? "sim" : "nao";

  const measurement = parseBooleanLike(values.requires_measurement);
  if (values.requires_measurement && measurement == null) warnings.push("requires_measurement deve ser sim/nao; valor mantido para revisão.");
  else values.requires_measurement = measurement == null ? "" : measurement ? "sim" : "nao";

  values.label_template = normalizeLabelTemplate(values.label_template);

  return { values, warnings };
}
