import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildManifestRows, selectedCategories } from "./demo-catalog-category-config.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.DEMO_PHOTOS_BUCKET || "items";

function required(name, value) {
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
}

function parseArgs() {
  const category = process.argv.find((arg) => arg.startsWith("--category="))?.split("=")[1] || (process.argv.includes("--all") ? "all" : "all");
  const dryRun = process.argv.includes("--dry-run");
  const keepExisting = process.argv.includes("--keep-existing");
  return { category, dryRun, keepExisting };
}

function resolveLocalFile(row) {
  const preferred = path.resolve(process.cwd(), row.local_file);
  if (existsSync(preferred)) return preferred;
  const legacy = path.resolve(process.cwd(), row.flat_legacy_file);
  if (existsSync(legacy)) return legacy;
  throw new Error(`Arquivo não encontrado: ${row.local_file} nem ${row.flat_legacy_file}`);
}

async function main() {
  const { category, dryRun, keepExisting } = parseArgs();
  const categories = selectedCategories(category);
  const rows = buildManifestRows(categories);
  const shortIds = Array.from(new Set(rows.map((row) => row.short_id)));

  required("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL", SUPABASE_URL);
  required("SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  console.log(`Categoria(s): ${categories.map((c) => c.slug).join(", ")}`);
  console.log(`Itens: ${shortIds.length} | Fotos: ${rows.length} | Bucket: ${BUCKET} | dry-run: ${dryRun ? "sim" : "não"}`);

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id,short_id")
    .in("short_id", shortIds);
  if (itemsError) throw itemsError;

  const itemByShortId = new Map((items ?? []).map((item) => [item.short_id, item]));
  const missingItems = shortIds.filter((shortId) => !itemByShortId.has(shortId));
  if (missingItems.length) {
    console.warn(`[AVISO] Itens não encontrados: ${missingItems.join(", ")}`);
    console.warn("Rode o seed do catálogo demo antes de subir as fotos.");
  }

  for (const shortId of shortIds) {
    const item = itemByShortId.get(shortId);
    if (!item?.id) continue;

    const itemRows = rows.filter((row) => row.short_id === shortId);

    if (!keepExisting) {
      const storagePaths = itemRows.map((row) => row.storage_path);
      console.log(`[INFO] Limpando vínculos anteriores do item ${shortId} para paths novos e legados...`);
      if (!dryRun) {
        await supabase.from("item_photos").delete().eq("item_id", item.id).in("storage_path", storagePaths);
        await supabase.from("item_photos").delete().eq("item_id", item.id).like("storage_path", `demo-catalog/${shortId}-%`);
      }
    }

    for (const row of itemRows) {
      const filePath = resolveLocalFile(row);
      const buffer = await readFile(filePath);

      console.log(`[${dryRun ? "DRY" : "OK"}] ${shortId} foto ${row.position} -> ${row.storage_path}`);
      if (dryRun) continue;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(row.storage_path, buffer, {
        contentType: "image/png",
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { error: deleteSamePositionError } = await supabase
        .from("item_photos")
        .delete()
        .eq("item_id", item.id)
        .eq("position", row.position);
      if (deleteSamePositionError) throw deleteSamePositionError;

      const { error: photoError } = await supabase.from("item_photos").insert({
        item_id: item.id,
        storage_path: row.storage_path,
        position: row.position,
      });
      if (photoError) throw photoError;
    }
  }

  console.log("Upload por categoria concluído.");
}

main().catch((error) => {
  console.error("Falha no upload das fotos demo por categoria:", error);
  process.exit(1);
});
