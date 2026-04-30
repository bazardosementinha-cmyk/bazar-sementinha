export type LabelTemplateCode = "P" | "M" | "G" | "TAG" | "SAQUINHO" | "FRAGIL";

export type LabelRecommendation = {
  code: LabelTemplateCode;
  title: string;
  description: string;
  examples: string[];
  printHint: string;
};

export type TaxonomyGroup = {
  category: string;
  description: string;
  commonTypes: string[];
  requiredChecks: string[];
  labelHint: LabelTemplateCode;
};

export const TAXONOMY_GROUPS: TaxonomyGroup[] = [
  {
    category: "Roupas",
    description: "Peças femininas, masculinas, infantis e unissex.",
    commonTypes: ["Blusa", "Camisa", "Vestido", "Calça", "Shorts", "Casaco", "Pijama"],
    requiredChecks: ["Tamanho", "Condição", "Marca se aparecer", "Defeito visível", "Foto de etiqueta/tamanho"],
    labelHint: "TAG",
  },
  {
    category: "Calçados",
    description: "Sapatos, tênis, sandálias, botas e chinelos.",
    commonTypes: ["Tênis", "Sapato", "Sandália", "Bota", "Chinelo"],
    requiredChecks: ["Numeração BR", "Estado da sola", "Par completo", "Foto lateral e superior"],
    labelHint: "G",
  },
  {
    category: "Acessórios",
    description: "Bolsas, cintos, lenços, óculos, bijuterias e itens pequenos.",
    commonTypes: ["Bolsa", "Cinto", "Lenço", "Colar", "Brinco", "Pulseira", "Óculos"],
    requiredChecks: ["Tamanho aproximado", "Fecho/ziper", "Material aparente", "Usar saquinho quando pequeno"],
    labelHint: "SAQUINHO",
  },
  {
    category: "Casa",
    description: "Utensílios domésticos, decoração, cozinha, vidro, louça e organização.",
    commonTypes: ["Travessa", "Copo", "Vaso", "Quadro", "Pote", "Organizador"],
    requiredChecks: ["Material", "Medidas", "Fragilidade", "Trincas/avarias", "Foto de detalhe"],
    labelHint: "FRAGIL",
  },
  {
    category: "Brinquedos",
    description: "Jogos, brinquedos, pelúcias e itens infantis.",
    commonTypes: ["Jogo", "Boneca", "Carrinho", "Pelúcia", "Quebra-cabeça"],
    requiredChecks: ["Peças completas", "Faixa etária quando houver", "Funcionamento", "Higiene"],
    labelHint: "M",
  },
  {
    category: "Artesanatos",
    description: "Peças artesanais, decoração autoral e itens feitos à mão.",
    commonTypes: ["Enfeite", "Quadro", "Peça decorativa", "Crochê", "Bordado"],
    requiredChecks: ["Medidas", "Material", "Cuidado no manuseio", "Foto em escala"],
    labelHint: "M",
  },
  {
    category: "Outros",
    description: "Itens que ainda não se encaixam nas categorias principais.",
    commonTypes: ["Diversos", "Colecionável", "Kit", "Item especial"],
    requiredChecks: ["Descrição clara", "Medidas se necessário", "Condição", "Local de estoque"],
    labelHint: "M",
  },
];

const LABELS: Record<LabelTemplateCode, LabelRecommendation> = {
  P: {
    code: "P",
    title: "Etiqueta P",
    description: "Boa para itens pequenos em que cabem apenas código e QR reduzido.",
    examples: ["peças pequenas", "mini acessórios", "itens sem área para etiqueta maior"],
    printHint: "Priorize código curto + QR. Evite título longo.",
  },
  M: {
    code: "M",
    title: "Etiqueta M",
    description: "Modelo padrão para a maioria dos itens: código, título curto, preço e QR.",
    examples: ["brinquedos", "artesanatos", "acessórios médios", "itens variados"],
    printHint: "Use quando o item tiver área suficiente para leitura confortável.",
  },
  G: {
    code: "G",
    title: "Etiqueta G",
    description: "Indicada para caixas, sapatos, kits e produtos volumosos.",
    examples: ["calçados", "caixas", "kits", "utensílios grandes"],
    printHint: "Pode incluir título maior, preço, QR e observação resumida.",
  },
  TAG: {
    code: "TAG",
    title: "Tag pendurada",
    description: "Ideal para roupas e peças delicadas, evitando colar adesivo no tecido.",
    examples: ["vestidos", "blusas", "casacos", "peças delicadas"],
    printHint: "Fixe com barbante, lacre ou tag no cabide/embalagem.",
  },
  SAQUINHO: {
    code: "SAQUINHO",
    title: "Etiqueta no saquinho",
    description: "Recomendada para bijuterias, joias, miudezas e peças fáceis de perder.",
    examples: ["brincos", "colares", "anéis", "peças pequenas"],
    printHint: "Cole a etiqueta no saquinho, não diretamente no produto.",
  },
  FRAGIL: {
    code: "FRAGIL",
    title: "Etiqueta frágil",
    description: "Use em vidro, porcelana, cerâmica e itens que exigem cuidado no manuseio.",
    examples: ["copos", "travessas", "vasos", "louças"],
    printHint: "Inclua alerta visual e guarde em local protegido.",
  },
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getLabelRecommendation(input: {
  category?: string | null;
  sizeType?: string | null;
  title?: string | null;
  notesInternal?: string | null;
}): LabelRecommendation {
  const haystack = normalizeText(`${input.category ?? ""} ${input.sizeType ?? ""} ${input.title ?? ""} ${input.notesInternal ?? ""}`);

  if (/fragil|vidro|porcelana|ceramica|louca|travessa|vaso|copo/.test(haystack)) return LABELS.FRAGIL;
  if (/brinco|colar|anel|pulseira|biju|joia|joias|miudeza/.test(haystack)) return LABELS.SAQUINHO;
  if (/roupa|vestido|blusa|camisa|calca|short|casaco|tecido/.test(haystack)) return LABELS.TAG;
  if (/calcado|sapato|tenis|sandalia|bota|chinelo/.test(haystack)) return LABELS.G;
  if (/medidas_cm|grande|caixa|kit|conjunto/.test(haystack)) return LABELS.G;

  return LABELS.M;
}

export function getTaxonomyGroup(category: string | null | undefined): TaxonomyGroup {
  const normalized = normalizeText(category);
  return (
    TAXONOMY_GROUPS.find((group) => normalizeText(group.category) === normalized) ??
    TAXONOMY_GROUPS.find((group) => group.category === "Outros") ??
    TAXONOMY_GROUPS[TAXONOMY_GROUPS.length - 1]!
  );
}

export function getKnownCategories(): string[] {
  return TAXONOMY_GROUPS.map((group) => group.category);
}
