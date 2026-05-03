const STEPS = [
  { title: "Receber", text: "Conferir se o item é vendável e separar por tipo." },
  { title: "Triar", text: "Verificar tamanho, estado, fragilidade, conjunto e cuidados." },
  { title: "Fotografar", text: "Registrar frente, detalhe, etiqueta/tamanho, defeito e escala." },
  { title: "Cadastrar", text: "Criar rascunho por fotos, CSV, Instagram ou manualmente." },
  { title: "Revisar", text: "Confirmar título, categoria, descrição, preço e localização." },
  { title: "Etiquetar", text: "Gerar QR, escolher modelo de etiqueta e identificar o item físico." },
  { title: "Guardar", text: "Colocar no local/caixa informado no sistema." },
  { title: "Publicar", text: "Liberar para venda somente quando cadastro e etiqueta estiverem prontos." },
  { title: "Vender", text: "Cliente compra; o sistema protege a reserva durante o prazo." },
  { title: "Separar", text: "Usar código/QR e localização para encontrar o item certo." },
  { title: "Entregar", text: "Confirmar pagamento/retirada e finalizar como vendido." },
];

export default function AdminProcessFlow({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Fluxo visual do processo</h2>
          <p className="text-sm text-slate-600">Do recebimento do item até a entrega ao comprador.</p>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {STEPS.map((step, index) => (
          <div key={step.title} className="relative rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {index + 1}
              </div>
              <div>
                <h3 className="font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
