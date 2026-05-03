import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { buildManifestRows, selectedCategories } from "./demo-catalog-category-config.mjs";

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[;"\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

async function main() {
  const categoryArg = process.argv.find((arg) => arg.startsWith("--category="))?.split("=")[1] || "all";
  const outDir = path.resolve(process.cwd(), "docs");
  const categories = selectedCategories(categoryArg);
  const rows = buildManifestRows(categories);

  await mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "demo-catalog-photo-manifest.json");
  const csvPath = path.join(outDir, "demo-catalog-photo-manifest.csv");

  await writeFile(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(";")),
  ].join("\n");
  await writeFile(csvPath, `${csv}\n`, "utf8");

  console.log(`[OK] Manifesto JSON: ${jsonPath}`);
  console.log(`[OK] Manifesto CSV:  ${csvPath}`);
  console.log(`[OK] Linhas: ${rows.length}`);
}

main().catch((error) => {
  console.error("Falha ao gerar manifesto demo:", error);
  process.exit(1);
});
