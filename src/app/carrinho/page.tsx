import { Shell, TopBar } from "@/components/Shell";
import CartClient from "./CartClient";

export const dynamic = "force-dynamic";

const address = "Rua Francisco de Assis Pupo, 390 — Vila Industrial — Campinas/SP";

export default function CarrinhoPage() {
  return (
    <>
      <TopBar />
      <Shell>
        <main className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-3xl font-semibold">Carrinho</h1>

          <CartClient />

          <section className="mt-8 rounded-xl border bg-white p-5">
            <h2 className="text-base font-semibold">Informações Importantes</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
              <li>
                Pagamento por <b>Pix</b> ou <b>Cartão de Crédito</b> (para cartão: fazer um Pix de <b>R$ 10,00</b> para reserva; o valor é devolvido no pagamento/retirada).
              </li>
              <li>
                Retirada no <b>TUCXA2</b> ({address}) conforme data e horário combinado.
              </li>
              <li>
                <b>Não realizamos trocas</b>.
              </li>
            </ul>
          </section>
        </main>
      </Shell>
    </>
  );
}
