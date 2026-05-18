# Automação de lembretes e cancelamento de pedidos

Esta rotina processa automaticamente os pedidos reservados do Bazar do Sementinha.

## Regras

- 8 horas após a criação do pedido: envia lembrete por e-mail, se o comprovante ainda não foi enviado.
- 16 horas após a criação do pedido: envia segundo lembrete por e-mail, se o comprovante ainda não foi enviado.
- No prazo de expiração do pedido, normalmente 24 horas após a criação: cancela o pedido, libera os itens para `available` e envia e-mail de cancelamento.
- Se o pedido já estiver com comprovante enviado, pagamento confirmado, entregue ou cancelado, a automação não envia lembretes.

## Endpoint

`GET /api/cron/process-order-notifications`

Header obrigatório:

`Authorization: Bearer <CRON_SECRET>`

## Teste seco

Use `dry_run=1` para conferir o que seria processado sem enviar e-mails nem alterar pedidos.



## Checkout e comprovante

O fechamento da compra usa Pix com valor preenchido: valor total ou Pix de R$ 1,00 para reserva e pagamento no cartão na retirada em até 10 dias úteis. O comprovante é anexado no próprio fechamento do pedido.
