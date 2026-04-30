export type HelpTopic = {
  title: string;
  description: string;
  bullets: string[];
  ctaHref?: string;
  ctaLabel?: string;
};

export const ADMIN_HELP_TOPICS = {
  importar: {
    title: "Antes de cadastrar",
    description:
      "O cadastro correto evita venda errada, item perdido no estoque e dúvida no momento da retirada.",
    bullets: [
      "Fotografe frente, detalhe, etiqueta/tamanho e defeitos, se houver.",
      "Use categoria e tamanho com atenção: roupa, calçado, acessório, casa, brinquedo, artesanato ou outros.",
      "Preencha o local/caixa antes de publicar para facilitar a separação do pedido.",
      "Depois de criar o rascunho, revise e gere o QR/etiqueta antes de guardar o item.",
    ],
    ctaHref: "/admin/manual#cadastro",
    ctaLabel: "Ver checklist completo",
  },
  itens: {
    title: "Gestão dos itens",
    description:
      "A lista de itens é o ponto de controle: revise rascunhos, publique somente itens prontos e proteja reservas ativas.",
    bullets: [
      "Rascunho: ainda precisa de revisão, etiqueta ou conferência.",
      "Disponível: aparece para venda no site.",
      "Reservado: não deve voltar para venda enquanto houver pedido ativo.",
      "Vendido: use somente depois de pagamento/retirada confirmados conforme o combinado.",
    ],
    ctaHref: "/admin/manual#status",
    ctaLabel: "Entender status",
  },
  editar: {
    title: "Revisão antes de publicar",
    description:
      "A revisão transforma uma foto em um produto vendável: título claro, categoria correta, preço, tamanho e localização.",
    bullets: [
      "O título deve ser curto e fácil de reconhecer fisicamente.",
      "A descrição deve destacar estado, benefício e qualquer detalhe importante.",
      "Categoria, tamanho e localização ajudam a vender e separar o item sem erro.",
      "Use a sugestão de etiqueta para escolher como identificar o produto físico.",
    ],
    ctaHref: "/admin/manual#revisao",
    ctaLabel: "Ver padrão de revisão",
  },
  qr: {
    title: "Etiqueta e QR Code",
    description:
      "A etiqueta conecta o item físico ao cadastro digital. O QR deve apontar para a página do item, e o código curto deve ficar legível.",
    bullets: [
      "Não coloque todos os dados dentro do QR: use o link do item.",
      "Para roupas delicadas, prefira tag pendurada em vez de adesivo no tecido.",
      "Para bijuterias e itens pequenos, cole a etiqueta no saquinho.",
      "Para vidro, louça e cerâmica, sinalize como frágil e guarde protegido.",
    ],
    ctaHref: "/admin/manual#etiquetas",
    ctaLabel: "Ver modelos de etiqueta",
  },
  manual: {
    title: "Processo oficial do Bazar Online",
    description:
      "Use este guia como referência para voluntários e administradores seguirem o mesmo padrão.",
    bullets: [
      "O objetivo é vender melhor, evitar retrabalho e facilitar a retirada.",
      "Cada item deve ter código, fotos, classificação, preço, localização e etiqueta.",
      "O processo pode ser consultado a qualquer momento pelo menu Manual.",
    ],
  },
} satisfies Record<string, HelpTopic>;

export type AdminHelpKey = keyof typeof ADMIN_HELP_TOPICS;
