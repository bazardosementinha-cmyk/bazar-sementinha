import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildManifestRows, selectedCategories } from "./demo-catalog-category-config.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.DEMO_PHOTOS_BUCKET || "items";

function parseArgs() {
  const category = process.argv.find((arg) => arg.startsWith("--category="))?.split("=")[1] || "all";
  const remote = process.argv.includes("--remote");
  return { category, remote };
}

async function main() {
  const { category, remote } = parseArgs();
  const categories = selectedCategories(category);
  const rows = buildManifestRows(categories);
  const missingLocal = [];

  for (const row of rows) {
    const preferred = path.resolve(process.cwd(), row.local_file);
    const legacy = path.resolve(process.cwd(), row.flat_legacy_file);
    if (!existsSync(preferred) && !existsSync(legacy)) missingLocal.push(row.local_file);
  }

  if (missingLocal.length) {
    console.error(`[ERRO] Arquivos locais ausentes: ${missingLocal.length}`);
    for (const file of missingLocal.slice(0, 40)) console.error(`- ${file}`);
    if (missingLocal.length > 40) console.error(`... +${missingLocal.length - 40} arquivo(s)`);
    process.exitCode = 1;
  } else {
    console.log(`[OK] Arquivos locais encontrados: ${rows.length}`);
  }

  if (remote) {
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Para --remote, informe NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY.");
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const shortIds = Array.from(new Set(rows.map((row) => row.short_id)));
    const { data: items, error } = await supabase.from("items").select("id,short_id").in("short_id", shortIds);
    if (error) throw error;
    const found = new Set((items ?? []).map((item) => item.short_id));
    const missingItems = shortIds.filter((shortId) => !found.has(shortId));
    if (missingItems.length) {
      console.error(`[ERRO] Itens não encontrados no banco: ${missingItems.join(", ")}`);
      process.exitCode = 1;
    } else {
      console.log(`[OK] Itens encontrados no banco: ${shortIds.length}`);
    }

    const { data: photos, error: photosError } = await supabase
      .from("item_photos")
      .select("storage_path")
      .in("storage_path", rows.map((row) => row.storage_path));
    if (photosError) throw photosError;
    console.log(`[INFO] Registros item_photos já existentes para os paths novos: ${photos?.length ?? 0}/${rows.length}`);
    console.log(`[INFO] Bucket configurado: ${BUCKET}`);
  }
}

main().catch((error) => {
  console.error("Falha na validação das fotos demo:", error);
  process.exit(1);
});
