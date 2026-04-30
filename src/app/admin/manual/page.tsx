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
    </div>
  );
}
