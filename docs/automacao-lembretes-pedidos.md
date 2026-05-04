# Automação de lembretes e cancelamento de pedidos

Este pacote adiciona a rotina que processa:

- lembrete de 8h (`remind_8h`)
- lembrete de 16h (`remind_16h`)
- cancelamento após expiração (`cancel_24h`)

Endpoint principal:

```txt
/api/cron/process-order-notifications
```

Para segurança, configure `CRON_SECRET` e chame o endpoint com:

```txt
Authorization: Bearer SEU_CRON_SECRET
```

Exemplo de teste manual:

```powershell
$env:CRON_SECRET="cole-aqui-o-mesmo-valor-do-vercel"
Invoke-RestMethod `
  -Uri "https://bazar-sementinha-izzg.vercel.app/api/cron/process-order-notifications?dry_run=1" `
  -Headers @{ Authorization = "Bearer $env:CRON_SECRET" } `
  -Method GET
```

Para execução real:

```powershell
Invoke-RestMethod `
  -Uri "https://bazar-sementinha-izzg.vercel.app/api/cron/process-order-notifications" `
  -Headers @{ Authorization = "Bearer $env:CRON_SECRET" } `
  -Method GET
```

## Observação sobre Vercel Hobby

O projeto está no plano Hobby. Atualmente, o Cron nativo da Vercel no Hobby só executa uma vez por dia e não serve para lembretes de 8h/16h com precisão. Para lembretes automáticos no horário certo, use um agendador externo chamando esse endpoint a cada 10 ou 15 minutos, ou migre para um plano que permita cron mais frequente.
