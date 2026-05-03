import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.DEMO_PHOTOS_BUCKET || "items";
const ASSET_DIR = path.resolve(process.cwd(), "public", "demo-catalog");

const CATEGORIES = [
  ["DRP", 7], ["DCA", 5], ["DAC", 7], ["DCS", 6], ["DBR", 5], ["DAR", 5], ["DOT", 4],
];

function required(name, value) {
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
}

function shortIds() {
  return CATEGORIES.flatMap(([prefix, count]) => Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`));
}

function assetName(shortId, position) {
  return `${shortId}-${String(position).padStart(2, "0")}.png`;
}

async function main() {
  required("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  required("SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY);

  if (!existsSync(ASSET_DIR)) throw new Error(`Pasta não encontrada: ${ASSET_DIR}`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const ids = shortIds();

  console.log(`Enviando ${ids.length * 3} fotos demo para o bucket '${BUCKET}'...`);

  for (const shortId of ids) {
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id,short_id")
      .eq("short_id", shortId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item?.id) {
      console.warn(`[SKIP] Item ${shortId} não encontrado. Rode o seed do catálogo demo antes.`);
      continue;
    }

    await supabase.from("item_photos").delete().eq("item_id", item.id);

    for (const position of [1, 2, 3]) {
      const name = assetName(shortId, position);
      const filePath = path.join(ASSET_DIR, name);
      if (!existsSync(filePath)) throw new Error(`Arquivo não encontrado: ${filePath}`);

      const storagePath = `demo-catalog/${name}`;
      const buffer = await readFile(filePath);

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { error: photoError } = await supabase.from("item_photos").insert({
        item_id: item.id,
        storage_path: storagePath,
        position,
      });
      if (photoError) throw photoError;

      console.log(`[OK] ${shortId} foto ${position}: ${storagePath}`);
    }
  }

  console.log("Upload das fotos demo concluído.");
}

main().catch((error) => {
  console.error("Falha no upload das fotos demo:", error);
  process.exit(1);
});
