export type HelpTopic = {
  title: string;
  description: string;
  bullets: string[];
  ctaHref?: string;
  ctaLabel?: string;
};

export const ADMIN_HELP_TOPICS = {
  inicio: {
    title: "Visão geral do processo",
    description:
      "O Bazar Online funciona melhor quando todos seguem o mesmo padrão: cadastrar, revisar, etiquetar, guardar, publicar, vender, separar e entregar.",
    bullets: [
      "A identificação correta evita troca de itens, perda no estoque e dúvidas na retirada.",
      "Cada item deve ter código curto, fotos, categoria, preço, localização física e QR/etiqueta.",
      "O manual do processo fica disponível para consulta pelos voluntários e administradores.",
      "Use a lista de itens como painel de controle: rascunho, disponível, reservado, vendido ou arquivado.",
    ],
    ctaHref: "/admin/manual",
    ctaLabel: "Abrir manual",
  },
  importar: {
    title: "Antes de cadastrar",
    description:
      "O cadastro correto evita venda errada, item perdido no estoque e dúvida no momento da retirada.",
    bullets: [
      "Fotografe frente, detalhe, etiqueta/tamanho e defeitos, se houver.",
      "Use categoria, subcategoria e tipo específico com atenção: roupa, calçado, acessório, casa, brinquedo, artesanato ou outros.",
      "Se já souber onde o item ficará, preencha location_box no CSV ou no formulário: Caixa A03, Arara Feminino 1, Prateleira Casa 2.",
      "Revise fragilidade, necessidade de medida e modelo de etiqueta antes de guardar o item.",
      "Depois de criar o rascunho, revise e gere o QR/etiqueta antes de publicar.",
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
      "Categoria, subcategoria, tipo específico, tamanho e localização ajudam a vender e separar o item sem erro.",
      "Use a sugestão de etiqueta e os campos frágil/precisa medir para escolher como identificar o produto físico.",
    ],
    ctaHref: "/admin/manual#revisao",
    ctaLabel: "Ver padrão de revisão",
  },
  ver: {
    title: "Conferência final do item",
    description:
      "Esta tela serve para validar se o cadastro digital bate com o produto físico antes de publicar ou movimentar o status.",
    bullets: [
      "Confira título, fotos, condição, preço e localização física.",
      "Compare a descrição com o item real para evitar promessa exagerada ou informação faltando.",
      "Antes de publicar, confirme se o QR/etiqueta já foi gerado e fixado corretamente.",
      "Se houver dúvida, volte para editar enquanto o item ainda estiver em revisão.",
    ],
    ctaHref: "/admin/manual#revisao",
    ctaLabel: "Ver checklist",
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
  pedidos: {
    title: "Pedidos e reservas",
    description:
      "Pedidos conectam o cliente ao estoque físico. O objetivo é proteger o item enquanto o pagamento é confirmado e separar sem erro.",
    bullets: [
      "Reserva ativa não deve liberar o item para outro comprador antes do prazo/cancelamento.",
      "Use o código do pedido e o código do item para localizar rapidamente na caixa/local informado.",
      "Quando o cliente enviar comprovante pelo pedido, confira valor, data e favorecido antes de marcar como pago.",
      "Cancelamentos devem devolver o item ao fluxo correto somente quando a reserva realmente expirar.",
    ],
    ctaHref: "/admin/manual#venda",
    ctaLabel: "Ver fluxo de venda",
  },
  pedidoDetalhe: {
    title: "Separação e entrega",
    description:
      "A página do pedido é o checklist de atendimento: confirmar pagamento, separar itens pelo código e registrar a conclusão.",
    bullets: [
      "Sempre confira os itens do pedido contra os códigos físicos antes da retirada.",
      "Comprovante enviado no site deve ser conferido antes de confirmar pagamento.",
      "Use WhatsApp apenas para dúvidas e retirada; o comprovante deve ficar registrado no pedido.",
      "Finalize como entregue/vendido somente depois da conferência completa.",
    ],
    ctaHref: "/admin/manual#separacao",
    ctaLabel: "Ver separação",
  },
  relatorio: {
    title: "Transparência do Bazar",
    description:
      "O relatório mostra o resultado do processo: itens vendidos, valores arrecadados e acompanhamento por status.",
    bullets: [
      "Status corretos mantêm o relatório confiável para prestação de contas.",
      "Itens vendidos devem refletir o valor efetivamente confirmado.",
      "Use os dados para ajustar categorias, preços e prioridades de cadastro.",
      "Em eventos e campanhas, o relatório ajuda a demonstrar impacto social.",
    ],
    ctaHref: "/admin/manual#transparencia",
    ctaLabel: "Ver boas práticas",
  },
  catalogoDemo: {
    title: "Catálogo demo interno",
    description:
      "O catálogo demo serve para treinamento, apresentação aos coordenadores e validação do processo sem aparecer para o público.",
    bullets: [
      "Itens demo devem ficar marcados como is_demo/visibility admin_demo e status de rascunho/review.",
      "Use os exemplos para mostrar categorias, fotos demonstrativas, localização física e tipos de etiqueta.",
      "Nunca misture itens demo com itens reais publicados na loja pública.",
      "Depois da apresentação, use o mesmo padrão para cadastrar lotes reais com fotos, local e etiqueta.",
    ],
    ctaHref: "/admin/manual#catalogo-demo",
    ctaLabel: "Ver regras do demo",
  },
  etiquetasLote: {
    title: "Impressão de etiquetas em lote",
    description:
      "A impressão em lote reduz retrabalho: selecione itens revisados ou demo, confira modelo de etiqueta e imprima em uma folha única.",
    bullets: [
      "Roupas usam TAG; calçados usam G; acessórios pequenos usam SAQUINHO; casa frágil usa FRAGIL; os demais usam M.",
      "Antes de imprimir, confirme código curto, preço, local/caixa e modelo de etiqueta.",
      "Depois de etiquetar fisicamente, o item pode avançar no processo de revisão/publicação.",
      "Para apresentação, use o catálogo demo e selecione todos os itens visíveis.",
    ],
    ctaHref: "/admin/manual#etiquetas-lote",
    ctaLabel: "Ver impressão em lote",
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
