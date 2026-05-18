# Checkout com Pix e comprovante no fechamento

## Fluxo atualizado

O cliente escolhe uma das opções:

1. **Pix do valor total**: o QR Code e o Pix Copia e Cola já levam o valor total do pedido. O cliente anexa o comprovante antes de registrar a compra.
2. **Pix de R$ 1,00 para reserva + cartão na retirada**: o QR Code e o Pix Copia e Cola já levam R$ 1,00. O restante é pago na retirada com cartão de crédito em até 10 dias úteis.

Em ambos os casos, o comprovante é anexado no próprio fechamento da compra. O pedido fica como `payment_status = submitted` após o upload e deve ser conferido pelo admin antes de marcar como pago.

## E-mails

Continuam ativos:

- e-mail de pedido criado;
- e-mail de comprovante recebido;
- e-mail de pagamento confirmado.

## Observação operacional

Os lembretes automáticos continuam como proteção para casos em que o pedido seja criado mas o comprovante não seja anexado por falha técnica ou abandono do fluxo.
