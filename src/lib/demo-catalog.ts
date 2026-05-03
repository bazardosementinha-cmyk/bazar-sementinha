import type { LabelTemplateCode } from "@/lib/item-taxonomy";

export type DemoCatalogItem = {
  short_id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  item_type: string;
  condition: string;
  price: number;
  price_from: number | null;
  gender: string | null;
  age_group: string | null;
  season: string | null;
  size_type: string;
  size_value: string | null;
  brand: string | null;
  color: string | null;
  material: string | null;
  measurements: string | null;
  is_fragile: boolean;
  requires_measurement: boolean;
  label_template: LabelTemplateCode;
  location_box: string;
  condition_notes: string | null;
  notes_internal: string;
  demo_group: string;
  demo_sort: number;
};

const SOCIAL_COPY = "100% do valor é revertido para a ação social do Bazar do Sementinha.";

function description(prefix: string, benefit: string) {
  return `${prefix}. ${benefit}. ${SOCIAL_COPY}`;
}

const ROUPAS = ["Blusa", "Camisa", "Vestido", "Calça", "Shorts", "Casaco", "Pijama"];
const CALCADOS = ["Tênis", "Sapato", "Sandália", "Bota", "Chinelo"];
const ACESSORIOS = ["Bolsa", "Cinto", "Lenço", "Colar", "Brinco", "Pulseira", "Óculos"];
const CASA = ["Travessa", "Copo", "Vaso", "Quadro", "Pote", "Organizador"];
const BRINQUEDOS = ["Jogo", "Boneca", "Carrinho", "Pelúcia", "Quebra-cabeça"];
const ARTESANATOS = ["Enfeite", "Quadro", "Peça decorativa", "Crochê", "Bordado"];
const OUTROS = ["Diversos", "Colecionável", "Kit", "Item especial"];

function id(prefix: string, index: number) {
  return `${prefix}${String(index + 1).padStart(2, "0")}`;
}

function roupa(type: string, index: number): DemoCatalogItem {
  const genders = ["feminino", "masculino", "infantil", "unissex"];
  const gender = genders[index % genders.length] ?? "unissex";
  const age = gender === "infantil" ? "infantil" : "adulto";
  const size = age === "infantil" ? "10 anos" : ["P", "M", "G", "42"][index % 4] ?? "M";
  return {
    short_id: id("DRP", index),
    title: `${type} demo ${gender} ${size}`,
    description: description(`${type} demonstrativo para treinar cadastro de roupas`, "Ajuda a validar tamanho, foto de etiqueta e tag pendurada antes da publicação"),
    category: "Roupas",
    subcategory: gender === "infantil" ? "Infantil" : gender === "masculino" ? "Masculino" : gender === "feminino" ? "Feminino" : "Unissex",
    item_type: type,
    condition: index % 3 === 0 ? "Muito bom" : "Bom",
    price: [18, 22, 35, 28, 20, 45, 25][index] ?? 25,
    price_from: null,
    gender,
    age_group: age,
    season: type === "Casaco" || type === "Pijama" ? "inverno" : "todas",
    size_type: age === "infantil" ? "infantil_idade" : type === "Calça" ? "roupa_numero" : "roupa_letras",
    size_value: size,
    brand: "Marca exemplo",
    color: ["azul", "branco", "floral", "preto", "vermelho", "cinza", "rosa"][index] ?? "colorido",
    material: "tecido",
    measurements: null,
    is_fragile: false,
    requires_measurement: true,
    label_template: "TAG",
    location_box: "Arara Demo Roupas",
    condition_notes: null,
    notes_internal: "Item demo: usar para treinamento de cadastro, revisão e impressão de tag.",
    demo_group: "Roupas - Etiqueta TAG",
    demo_sort: 100 + index,
  };
}

function calcado(type: string, index: number): DemoCatalogItem {
  return {
    short_id: id("DCA", index),
    title: `${type} demo numeração ${36 + index}`,
    description: description(`${type} demonstrativo para treinar cadastro de calçados`, "Ajuda a validar numeração, foto da sola e etiqueta maior na embalagem"),
    category: "Calçados",
    subcategory: "Adulto",
    item_type: type,
    condition: "Bom",
    price: [40, 35, 28, 50, 18][index] ?? 30,
    price_from: null,
    gender: null,
    age_group: null,
    season: null,
    size_type: "calcado_br",
    size_value: String(36 + index),
    brand: "Marca exemplo",
    color: ["preto", "marrom", "bege", "azul", "branco"][index] ?? "neutro",
    material: "sintético",
    measurements: null,
    is_fragile: false,
    requires_measurement: true,
    label_template: "G",
    location_box: "Prateleira Demo Calçados",
    condition_notes: "Conferir sola e par completo.",
    notes_internal: "Item demo: validar etiqueta G e conferência do par.",
    demo_group: "Calçados - Etiqueta G",
    demo_sort: 200 + index,
  };
}

function acessorio(type: string, index: number): DemoCatalogItem {
  const small = ["Colar", "Brinco", "Pulseira"].includes(type);
  return {
    short_id: id("DAC", index),
    title: `${type} demo ${small ? "em saquinho" : "acessório"}`,
    description: description(`${type} demonstrativo para treinar cadastro de acessórios`, "Ajuda a validar detalhe, material aparente e controle de itens pequenos"),
    category: "Acessórios",
    subcategory: small ? "Bijuterias" : "Uso pessoal",
    item_type: type,
    condition: "Muito bom",
    price: [30, 12, 10, 15, 8, 9, 18][index] ?? 12,
    price_from: null,
    gender: null,
    age_group: null,
    season: null,
    size_type: "livre",
    size_value: null,
    brand: null,
    color: ["caramelo", "preto", "estampado", "dourado", "prata", "colorido", "marrom"][index] ?? "neutro",
    material: small ? "metal/bijuteria" : "material diverso",
    measurements: null,
    is_fragile: false,
    requires_measurement: false,
    label_template: "SAQUINHO",
    location_box: "Caixa Demo Acessórios",
    condition_notes: null,
    notes_internal: "Item demo: validar etiqueta no saquinho e controle de peças pequenas.",
    demo_group: "Acessórios - Etiqueta SAQUINHO",
    demo_sort: 300 + index,
  };
}

function casa(type: string, index: number): DemoCatalogItem {
  const fragile = ["Travessa", "Copo", "Vaso", "Quadro", "Pote"].includes(type);
  return {
    short_id: id("DCS", index),
    title: `${type} demo casa ${fragile ? "frágil" : "organização"}`,
    description: description(`${type} demonstrativo para treinar cadastro de casa`, "Ajuda a validar medidas, material, avarias e sinalização de fragilidade"),
    category: "Casa",
    subcategory: type === "Organizador" ? "Organização" : "Decoração e cozinha",
    item_type: type,
    condition: "Bom",
    price: [32, 8, 25, 35, 12, 20][index] ?? 20,
    price_from: null,
    gender: null,
    age_group: null,
    season: null,
    size_type: "medidas_cm",
    size_value: "aprox. 20x15cm",
    brand: null,
    color: ["transparente", "vidro", "branco", "colorido", "azul", "neutro"][index] ?? "neutro",
    material: fragile ? "vidro/louça" : "plástico",
    measurements: "aprox. 20x15cm",
    is_fragile: fragile,
    requires_measurement: true,
    label_template: fragile ? "FRAGIL" : "M",
    location_box: "Prateleira Demo Casa",
    condition_notes: fragile ? "Conferir trincas, lascas e embalagem protegida." : null,
    notes_internal: "Item demo: validar etiqueta frágil e local protegido.",
    demo_group: "Casa - Etiqueta FRAGIL",
    demo_sort: 400 + index,
  };
}

function brinquedo(type: string, index: number): DemoCatalogItem {
  return {
    short_id: id("DBR", index),
    title: `${type} demo infantil`,
    description: description(`${type} demonstrativo para treinar cadastro de brinquedos`, "Ajuda a validar completude, higiene, faixa etária e etiqueta média"),
    category: "Brinquedos",
    subcategory: "Infantil",
    item_type: type,
    condition: index === 0 ? "Bom" : "Muito bom",
    price: [18, 22, 12, 25, 15][index] ?? 18,
    price_from: null,
    gender: null,
    age_group: "infantil",
    season: null,
    size_type: "livre",
    size_value: null,
    brand: null,
    color: "colorido",
    material: type === "Pelúcia" ? "tecido/pelúcia" : "plástico/papelão",
    measurements: null,
    is_fragile: false,
    requires_measurement: false,
    label_template: "M",
    location_box: "Caixa Demo Brinquedos",
    condition_notes: "Conferir peças e funcionamento quando aplicável.",
    notes_internal: "Item demo: validar fotos de detalhe e completude.",
    demo_group: "Brinquedos - Etiqueta M",
    demo_sort: 500 + index,
  };
}

function artesanato(type: string, index: number): DemoCatalogItem {
  return {
    short_id: id("DAR", index),
    title: `${type} demo artesanal`,
    description: description(`${type} demonstrativo para treinar cadastro de artesanatos`, "Ajuda a valorizar o feito à mão, medidas e cuidado no manuseio"),
    category: "Artesanatos",
    subcategory: "Feito à mão",
    item_type: type,
    condition: "Muito bom",
    price: [20, 35, 28, 18, 22][index] ?? 22,
    price_from: null,
    gender: null,
    age_group: null,
    season: null,
    size_type: "medidas_cm",
    size_value: "aprox. 15cm",
    brand: null,
    color: "artesanal",
    material: type === "Crochê" || type === "Bordado" ? "linha/tecido" : "material artesanal",
    measurements: "aprox. 15cm",
    is_fragile: false,
    requires_measurement: true,
    label_template: "M",
    location_box: "Caixa Demo Artesanatos",
    condition_notes: null,
    notes_internal: "Item demo: validar copy que valoriza peça autoral.",
    demo_group: "Artesanatos - Etiqueta M",
    demo_sort: 600 + index,
  };
}

function outro(type: string, index: number): DemoCatalogItem {
  return {
    short_id: id("DOT", index),
    title: `${type} demo especial`,
    description: description(`${type} demonstrativo para treinar cadastro de itens variados`, "Ajuda a decidir quando usar Outros e quando criar categoria mais específica"),
    category: "Outros",
    subcategory: "Diversos",
    item_type: type,
    condition: "Bom",
    price: [10, 35, 25, 45][index] ?? 20,
    price_from: null,
    gender: null,
    age_group: null,
    season: null,
    size_type: "livre",
    size_value: null,
    brand: null,
    color: "variado",
    material: "diverso",
    measurements: null,
    is_fragile: false,
    requires_measurement: false,
    label_template: "M",
    location_box: "Caixa Demo Outros",
    condition_notes: null,
    notes_internal: "Item demo: validar triagem quando a categoria ainda é incerta.",
    demo_group: "Outros - Etiqueta M",
    demo_sort: 700 + index,
  };
}

export const DEMO_CATALOG_ITEMS: DemoCatalogItem[] = [
  ...ROUPAS.map(roupa),
  ...CALCADOS.map(calcado),
  ...ACESSORIOS.map(acessorio),
  ...CASA.map(casa),
  ...BRINQUEDOS.map(brinquedo),
  ...ARTESANATOS.map(artesanato),
  ...OUTROS.map(outro),
];

export function getDemoCatalogGroups() {
  const map = new Map<string, DemoCatalogItem[]>();
  for (const item of DEMO_CATALOG_ITEMS) {
    const arr = map.get(item.demo_group) ?? [];
    arr.push(item);
    map.set(item.demo_group, arr);
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
}

export function demoPhotoAssetPath(shortId: string, position: number) {
  return `/demo-catalog/${shortId}-${String(position).padStart(2, "0")}.png`;
}

export function demoPhotoStoragePath(shortId: string, position: number) {
  return `demo-catalog/${shortId}-${String(position).padStart(2, "0")}.png`;
}

export function demoPhotoDataUri(item: Pick<DemoCatalogItem, "category" | "item_type" | "label_template">, index: number) {
  const title = `${item.item_type}`;
  const subtitle = index === 1 ? "Foto principal" : index === 2 ? "Detalhe/medida" : "Etiqueta/condição";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ecfdf5"/><stop offset="1" stop-color="#dbeafe"/></linearGradient></defs><rect width="900" height="650" rx="36" fill="url(#g)"/><rect x="70" y="70" width="760" height="510" rx="30" fill="white" fill-opacity="0.78" stroke="#94a3b8" stroke-width="3"/><text x="450" y="215" text-anchor="middle" font-family="Arial" font-size="54" font-weight="700" fill="#0f172a">${escapeSvg(title)}</text><text x="450" y="292" text-anchor="middle" font-family="Arial" font-size="32" fill="#334155">${escapeSvg(item.category)} • ${escapeSvg(subtitle)}</text><text x="450" y="380" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#047857">Etiqueta ${escapeSvg(item.label_template)}</text><text x="450" y="470" text-anchor="middle" font-family="Arial" font-size="24" fill="#64748b">Imagem demonstrativa para treinamento</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
