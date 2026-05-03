export const CATEGORY_CONFIG = [
  { slug: "roupas", label: "Roupas", prefix: "DRP", count: 7, group: "Roupas - Etiqueta TAG" },
  { slug: "calcados", label: "Calçados", prefix: "DCA", count: 5, group: "Calçados - Etiqueta G" },
  { slug: "acessorios", label: "Acessórios", prefix: "DAC", count: 7, group: "Acessórios - Etiqueta SAQUINHO" },
  { slug: "casa", label: "Casa", prefix: "DCS", count: 6, group: "Casa - Etiqueta FRAGIL" },
  { slug: "brinquedos", label: "Brinquedos", prefix: "DBR", count: 5, group: "Brinquedos - Etiqueta M" },
  { slug: "artesanatos", label: "Artesanatos", prefix: "DAR", count: 5, group: "Artesanatos - Etiqueta M" },
  { slug: "outros", label: "Outros", prefix: "DOT", count: 4, group: "Outros - Etiqueta M" },
];

export function shortIdsForCategory(category) {
  return Array.from({ length: category.count }, (_, index) => `${category.prefix}${String(index + 1).padStart(2, "0")}`);
}

export function buildManifestRows(categories = CATEGORY_CONFIG) {
  return categories.flatMap((category) =>
    shortIdsForCategory(category).flatMap((shortId) =>
      [1, 2, 3].map((position) => ({
        category_slug: category.slug,
        category_label: category.label,
        demo_group: category.group,
        short_id: shortId,
        position,
        local_file: `public/demo-catalog-categories/${category.slug}/${shortId}/${String(position).padStart(2, "0")}.png`,
        flat_legacy_file: `public/demo-catalog/${shortId}-${String(position).padStart(2, "0")}.png`,
        storage_path: `demo-catalog/${category.slug}/${shortId}/${String(position).padStart(2, "0")}.png`,
      }))
    )
  );
}

export function selectedCategories(value) {
  if (!value || value === "all") return CATEGORY_CONFIG;
  const wanted = new Set(String(value).split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
  const selected = CATEGORY_CONFIG.filter((category) => wanted.has(category.slug) || wanted.has(category.prefix.toLowerCase()));
  if (!selected.length) {
    throw new Error(`Categoria inválida: ${value}. Use: ${CATEGORY_CONFIG.map((c) => c.slug).join(", ")}, ou all.`);
  }
  return selected;
}
