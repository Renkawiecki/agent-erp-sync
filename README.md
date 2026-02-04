# Agent ERP Sync

Agente simples de teste para sincronização com o backend web.

## Instalação

```bash
npm install
```

## Configuração

1. Copie o arquivo `env.example` para `.env`:

```bash
copy env.example .env
```

2. Edite o arquivo `.env` com suas credenciais:

```env
VPS_API_URL=https://app.coreban.com.br/api/sync/expedicao
VPS_API_KEY=sua-chave-aqui
```

## Uso

Execute o teste de integração:

```bash
npm start
```

ou

```bash
node index.js
```

## O que o agente faz

1. Lê as variáveis de ambiente `VPS_API_URL` e `VPS_API_KEY`
2. Monta um payload fixo de teste com:
   - `data_expedicao`: data atual
   - `placa`: "ABC1234"
   - `praca_codigo`: "SP001"
   - `produto_codigo`: "BAN001"
   - `total_kg_planejado`: 1500.50
3. Envia o payload via POST para a URL configurada
4. Exibe a resposta do servidor no console

## Exemplo de saída

```
═══════════════════════════════════════════════════════
  🚀 Agent ERP Sync - Teste de Integração
═══════════════════════════════════════════════════════

📡 URL: https://app.coreban.com.br/api/sync/expedicao
🔑 API Key: abc12345...

📦 Payload enviado:
{
  "data_expedicao": "2026-02-04",
  "placa": "ABC1234",
  "praca_codigo": "SP001",
  "produto_codigo": "BAN001",
  "total_kg_planejado": 1500.5
}

───────────────────────────────────────────────────────

✅ Resposta do servidor (HTTP 200):
{
  "ok": true,
  "changed": false
}

📊 Resumo:
   - ok: true
   - changed: false

═══════════════════════════════════════════════════════
```
