# Agent ERP Sync

Agente de sincronização que lê dados do Firebird (ERP local) e envia para a API web.

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
# API
VPS_API_URL=https://app.coreban.com.br/api/sync/expedicao
VPS_API_KEY=ck_sua_chave_aqui

# Firebird
FB_HOST=localhost
FB_PORT=3050
FB_DATABASE=C:\caminho\para\banco.fdb
FB_USER=SYSDBA
FB_PASSWORD=masterkey
```

## Uso

Execute a sincronização:

```bash
npm start
```

## O que o agente faz

1. **Conecta ao Firebird** local e executa a query de expedição
2. **Consulta os dados** de `VINTERNA`, `VINTERNA_PRODUTO`, `VCO`, `PRODUTO` e `PRACA`
3. **Agrupa por** placa, praça e produto
4. **Calcula**:
   - Total KG (quantidade + troca + DB)
   - KG de troca
   - KG de DB
   - Caixas fechadas
   - KG restante
   - Fator de embalagem
5. **Envia cada registro** via POST para a API
6. **Exibe o resumo** com sucessos, alterações e erros

## Dados enviados para API

Cada registro enviado contém:

| Campo | Descrição |
|-------|-----------|
| `data_expedicao` | Data atual (YYYY-MM-DD) |
| `placa` | Placa do veículo |
| `praca_codigo` | Código da praça |
| `produto_codigo` | Código do produto |
| `total_kg_planejado` | Total em KG (quantidade + troca + DB) |
| `kg_troca` | KG de troca |
| `kg_db` | KG de DB |
| `caixas_fechadas` | Quantidade de caixas fechadas |
| `kg_restante` | KG fora das caixas |
| `fator_embalagem` | Fator de conversão da embalagem |
| `origem` | Sempre "firebird" |

## Exemplo de saída

```
═══════════════════════════════════════════════════════════════════
  🚀 Agent ERP Sync - Sincronização Firebird → API
═══════════════════════════════════════════════════════════════════

📅 Data expedição: 2026-02-05
📡 API URL: https://app.coreban.com.br/api/sync/expedicao
🔑 API Key: ck_83ead938...
🗄️  Firebird: localhost:3050/C:\dados\banco.fdb

───────────────────────────────────────────────────────────────────

📊 Consultando Firebird...
✅ 15 registro(s) encontrado(s)

📤 Enviando registros para API...

  ✅ ABC1234 | Praça 1 | Produto 10 → ALTERADO
  ✓  ABC1234 | Praça 1 | Produto 11 → sem alteração
  ✅ DEF5678 | Praça 2 | Produto 10 → ALTERADO

───────────────────────────────────────────────────────────────────

📊 Resumo da sincronização:
   Total de registros: 15
   ✅ Sucessos: 15
   📝 Alterados: 8
   ❌ Erros: 0

═══════════════════════════════════════════════════════════════════
```
