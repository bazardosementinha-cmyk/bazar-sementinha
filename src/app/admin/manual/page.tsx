import Link from "next/link";
import AdminProcessFlow from "@/components/AdminProcessFlow";
import ContextHelp from "@/components/ContextHelp";
import { ADMIN_HELP_TOPICS } from "@/lib/admin-help";
import { TAXONOMY_GROUPS, getLabelRecommendation } from "@/lib/item-taxonomy";

const LABEL_EXAMPLES = [
  getLabelRecommendation({ category: "Roupas" }),
  getLabelRecommendation({ category: "Acessórios", title: "Brinco" }),
  getLabelRecommendation({ category: "Calçados" }),
  getLabelRecommendation({ category: "Casa", notesInternal: "frágil" }),
];

export default function AdminManualPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manual do Processo do Bazar Online</h1>
          <p className="mt-1 max-w-3xl text-slate-600">
            Guia prático para cadastrar, revisar, etiquetar, publicar, vender e separar os itens do Bazar do Sementinha com menos erro e mais velocidade.
          </p>
        </div>
        <Link href="/admin/itens" className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
          Voltar para itens
        </Link>
      </div>

      <ContextHelp topic={ADMIN_HELP_TOPICS.manual} className="mt-4" />

      <div id="fluxo" className="mt-6">
        <AdminProcessFlow />
      </div>

      <section id="processo-publico" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <h2 className="text-xl font-bold">Processo visto pelo comprador</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          Na loja pública, o processo não deve parecer burocrático. Ele deve transmitir confiança:
          o comprador escolhe um item único, reserva pelo site, envia o comprovante do Pix diretamente no pedido e a equipe separa pelo código após conferir o pagamento.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {["Escolher", "Reservar", "Enviar comprovante no pedido", "Aguardar conferência", "Retirar"].map((step, index) => (
            <div key={step} className="rounded-2xl bg-white/80 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Passo {index + 1}</div>
              <div className="mt-1 font-bold">{step}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="deep-dive" className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">Como aplicar Deep Dive no Bazar</h2>
        <p className="mt-2 text-sm text-slate-600">
          Para o cliente, não basta listar características. A descrição deve explicar por que aquele item facilita a vida,
          economiza dinheiro, evita desperdício, gera confiança e ainda transforma uma compra simples em apoio ao Sementinha.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold">Característica</div>
            <p className="mt-1 text-sm text-slate-600">Ex.: peça em bom estado, com fotos e código interno.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold">Por que existe?</div>
            <p className="mt-1 text-sm text-slate-600">Para o comprador saber exatamente o que está reservando.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold">Por que a pessoa quer?</div>
            <p className="mt-1 text-sm text-slate-600">Para economizar, comprar com segurança e participar de uma causa.</p>
          </div>
        </div>
      </section>

      <section id="cadastro" className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">1. Cadastro do item</h2>
        <p className="mt-2 text-sm text-slate-600">
          O cadastro começa antes da tela: o item precisa ser entendido fisicamente. Uma boa entrada reduz retrabalho na revisão.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold">Fotos mínimas</div>
            <p className="mt-1 text-sm text-slate-600">Frente, detalhe, etiqueta/tamanho e defeito, se houver.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold">Informações obrigatórias</div>
            <p className="mt-1 text-sm text-slate-600">Título, categoria, condição, preço, tamanho quando aplicável e local/caixa.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold">Status inicial</div>
            <p className="mt-1 text-sm text-slate-600">Todo item novo deve nascer como rascunho/em revisão.</p>
          </div>
        </div>
      </section>

      <section id="taxonomia" className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">2. Classificação por tipo de produto</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use categorias simples, mas revise os atributos que realmente ajudam a vender e separar cada tipo de item.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {TAXONOMY_GROUPS.map((group) => (
            <div key={group.category} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{group.category}</h3>
                  <p className="mt-1 text-sm text-slate-600">{group.description}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700">Etiqueta {group.labelHint}</span>
              </div>
              <div className="mt-3 text-sm">
                <div className="font-semibold">Tipos comuns</div>
                <p className="text-slate-600">{group.commonTypes.join(", ")}</p>
              </div>
              <div className="mt-3 text-sm">
                <div className="font-semibold">Conferir antes de publicar</div>
                <ul className="mt-1 grid gap-1 text-slate-600">
                  {group.requiredChecks.map((check) => (
                    <li key={check}>• {check}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="revisao" className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">3. Revisão antes da publicação</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold">Checklist de revisão</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>• Título curto e reconhecível fisicamente.</li>
              <li>• Categoria correta e tamanho/medida quando necessário.</li>
              <li>• Descrição honesta, com defeitos mencionados.</li>
              <li>• Preço revisado.</li>
              <li>• Local/caixa preenchido.</li>
              <li>• Etiqueta escolhida antes de publicar.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold">Regra de publicação</div>
            <p className="mt-2 text-sm text-slate-600">
              Só publique quando o item puder ser encontrado fisicamente pelo código, QR ou local/caixa. Se o item ainda não foi etiquetado, mantenha em revisão.
            </p>
          </div>
        </div>
      </section>

      <section id="etiquetas" className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">4. Etiquetas e QR Code</h2>
        <p className="mt-2 text-sm text-slate-600">
          O QR deve apontar para a página pública do item. A etiqueta deve trazer pelo menos o código curto e ser adequada ao produto físico.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {LABEL_EXAMPLES.map((label) => (
            <div key={label.code} className="rounded-2xl border bg-slate-50 p-4">
              <div className="font-bold">{label.title}</div>
              <p className="mt-1 text-sm text-slate-600">{label.description}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">{label.printHint}</p>
              <p className="mt-2 text-xs text-slate-500">Exemplos: {label.examples.join(", ")}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="status" className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">5. Status do item</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Quando usar</th>
                <th className="px-3 py-2">Cuidados</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-3 py-2 font-semibold">Em revisão</td>
                <td className="px-3 py-2">Item ainda não está pronto para venda.</td>
                <td className="px-3 py-2">Use enquanto faltarem fotos, preço, etiqueta ou local.</td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 font-semibold">Disponível</td>
                <td className="px-3 py-2">Item pronto e publicado no site.</td>
                <td className="px-3 py-2">Só usar após etiqueta e localização física.</td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 font-semibold">Reservado</td>
                <td className="px-3 py-2">Existe pedido ou separação pendente.</td>
                <td className="px-3 py-2">Não voltar para disponível enquanto houver reserva ativa.</td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 font-semibold">Vendido</td>
                <td className="px-3 py-2">Pagamento/retirada confirmados.</td>
                <td className="px-3 py-2">Use para histórico e prestação de contas.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section id="campos-operacionais" className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">Campos operacionais no banco</h2>
        <p className="mt-2 text-sm text-slate-600">
          A estrutura nova permite registrar subcategoria, tipo específico, marca, cor, material, medidas,
          fragilidade, necessidade de medição e modelo de etiqueta recomendado.
        </p>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          {[
            "subcategory / item_type",
            "brand / color / material",
            "measurements / condition_notes",
            "is_fragile / requires_measurement",
            "label_template / review_status",
            "qr_printed_at / tagged_at / reviewed_at / published_at",
          ].map((field) => (
            <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
              {field}
            </div>
          ))}
        </div>
      </section>

      <section id="comprovante-pix" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <h2 className="text-xl font-bold">Fluxo seguro do comprovante Pix</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          O cliente não precisa mais enviar o comprovante pelo WhatsApp. Ele acessa o pedido, faz upload do arquivo e o sistema avisa o Bazar por e-mail com cópia para o cliente.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white/80 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">1. Cliente</div>
            <div className="mt-1 font-bold">Envia comprovante no pedido</div>
            <p className="mt-1 text-sm text-emerald-900">JPG, PNG, WEBP ou PDF até 8 MB.</p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">2. Sistema</div>
            <div className="mt-1 font-bold">Marca como Comprovante enviado</div>
            <p className="mt-1 text-sm text-emerald-900">O pedido para de receber lembretes automáticos.</p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">3. Bazar</div>
            <div className="mt-1 font-bold">Confere o Pix</div>
            <p className="mt-1 text-sm text-emerald-900">Confira valor, favorecido, data e código do pedido.</p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">4. Admin</div>
            <div className="mt-1 font-bold">Confirma pagamento</div>
            <p className="mt-1 text-sm text-emerald-900">Depois disso, a retirada pode ser alinhada.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
