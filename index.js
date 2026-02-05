require('dotenv').config();
const Firebird = require('node-firebird');

// ══════════════════════════════════════════════════════════════════════════════
// Variáveis de ambiente
// ══════════════════════════════════════════════════════════════════════════════

const VPS_API_URL = process.env.VPS_API_URL;
const VPS_API_KEY = process.env.VPS_API_KEY;

// Configurações dos bancos Firebird
const empresas = [
  {
    nome: 'Marília',
    config: {
      host: process.env.FB_MARILIA_HOST || '172.16.2.2',
      port: parseInt(process.env.FB_MARILIA_PORT || '3050'),
      database: process.env.FB_MARILIA_DATABASE || 'D:\\Sistema\\Orteco\\Pedido\\Pedido.fdb',
      user: process.env.FB_MARILIA_USER || 'SYSDBA',
      password: process.env.FB_MARILIA_PASSWORD,
      lowercase_keys: false,
      role: null,
      pageSize: 4096
    }
  },
  {
    nome: 'Massaranduba',
    config: {
      host: process.env.FB_MATRIZ_HOST || '172.16.1.2',
      port: parseInt(process.env.FB_MATRIZ_PORT || '3050'),
      database: process.env.FB_MATRIZ_DATABASE || 'F:\\Sistema\\Orteco\\Pedido\\Pedido.fdb',
      user: process.env.FB_MATRIZ_USER || 'SYSDBA',
      password: process.env.FB_MATRIZ_PASSWORD,
      lowercase_keys: false,
      role: null,
      pageSize: 4096
    }
  }
];

// ══════════════════════════════════════════════════════════════════════════════
// Validações
// ══════════════════════════════════════════════════════════════════════════════

if (!VPS_API_URL) {
  console.error('❌ Erro: VPS_API_URL não definida');
  process.exit(1);
}

if (!VPS_API_KEY) {
  console.error('❌ Erro: VPS_API_KEY não definida');
  process.exit(1);
}

for (const emp of empresas) {
  if (!emp.config.password) {
    console.error(`❌ Erro: Senha do Firebird não definida para ${emp.nome}`);
    process.exit(1);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Query Firebird - Expedição
// ══════════════════════════════════════════════════════════════════════════════

function getDataHoje() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function buildQuery(dataExpedicao) {
  return `
    SELECT
        CASE 
            WHEN vi.VCO = 0 THEN 'VCO 0'
            ELSE vco.PLACA
        END AS PLACA,
        pr.CODIGO AS PRACA_CODIGO,
        pr.PRACA  AS PRACA_NOME,
        p.CODIGO  AS PRODUTO_CODIGO,
        p.PRODUTO AS PRODUTO_NOME,

        -- TROCA (KG)
        SUM(COALESCE(vip.QUANTIDADE_TROCA, 0)) AS TOTAL_TROCA,

        -- DB (KG)
        SUM(COALESCE(vip.QUANTIDADE_DB, 0)) AS TOTAL_DB,

        -- TOTAL KG (quantidade + troca + db)
        SUM(
            COALESCE(vip.QUANTIDADE, 0)
          + COALESCE(vip.QUANTIDADE_TROCA, 0)
          + COALESCE(vip.QUANTIDADE_DB, 0)
        ) AS TOTAL_KG,

        -- FATOR EMBALAGEM
        MAX(vip.EMBALAGEM_UNIDADE_SIGLA_FATOR) AS FATOR_EMBALAGEM,

        -- CAIXAS FECHADAS
        FLOOR(
            CAST(
                SUM(
                    COALESCE(vip.QUANTIDADE, 0)
                  + COALESCE(vip.QUANTIDADE_TROCA, 0)
                  + COALESCE(vip.QUANTIDADE_DB, 0)
                ) AS DOUBLE PRECISION
            )
            / NULLIF(MAX(vip.EMBALAGEM_UNIDADE_SIGLA_FATOR), 0)
        ) AS CAIXAS_FECHADAS,

        -- KG RESTANTE (fora da caixa)
        CAST(
            SUM(
                COALESCE(vip.QUANTIDADE, 0)
              + COALESCE(vip.QUANTIDADE_TROCA, 0)
              + COALESCE(vip.QUANTIDADE_DB, 0)
            ) AS DOUBLE PRECISION
        )
        -
        (
            FLOOR(
                CAST(
                    SUM(
                        COALESCE(vip.QUANTIDADE, 0)
                      + COALESCE(vip.QUANTIDADE_TROCA, 0)
                      + COALESCE(vip.QUANTIDADE_DB, 0)
                    ) AS DOUBLE PRECISION
                )
                / NULLIF(MAX(vip.EMBALAGEM_UNIDADE_SIGLA_FATOR), 0)
            )
            * MAX(vip.EMBALAGEM_UNIDADE_SIGLA_FATOR)
        ) AS KG_RESTANTE

    FROM VINTERNA vi
    JOIN VINTERNA_PRODUTO vip
        ON vip.NUMERO = vi.NUMERO
    LEFT JOIN VCO vco
        ON vco.CODIGO = vi.VCO
    JOIN PRODUTO p
        ON p.CODIGO = vip.PRODUTO_CODIGO
    JOIN PRACA pr
        ON pr.CODIGO = vip.PRACA_CODIGO

    WHERE vi.SAIDA BETWEEN DATE '${dataExpedicao}' AND DATE '${dataExpedicao}'

    GROUP BY
        CASE 
            WHEN vi.VCO = 0 THEN 'VCO 0'
            ELSE vco.PLACA
        END,
        pr.CODIGO,
        pr.PRACA,
        p.CODIGO,
        p.PRODUTO

    ORDER BY
        PLACA,
        pr.PRACA,
        p.PRODUTO
  `;
}

// ══════════════════════════════════════════════════════════════════════════════
// Funções de conexão e consulta
// ══════════════════════════════════════════════════════════════════════════════

function queryFirebird(config, query) {
  return new Promise((resolve, reject) => {
    Firebird.attach(config, (err, db) => {
      if (err) {
        reject(err);
        return;
      }

      db.query(query, [], (err, result) => {
        db.detach();

        if (err) {
          reject(err);
          return;
        }

        resolve(result);
      });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Envio para API
// ══════════════════════════════════════════════════════════════════════════════

async function enviarParaAPI(payload) {
  const response = await fetch(VPS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': VPS_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}

// ══════════════════════════════════════════════════════════════════════════════
// Função principal
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  🚀 Agent ERP Sync - Sincronização Firebird → API');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const dataExpedicao = getDataHoje();
  
  console.log('📅 Data expedição:', dataExpedicao);
  console.log('📡 API URL:', VPS_API_URL);
  console.log('🔑 API Key:', VPS_API_KEY.substring(0, 12) + '...');
  console.log('\n🏢 Empresas configuradas:');
  for (const emp of empresas) {
    console.log(`   - ${emp.nome}: ${emp.config.host}:${emp.config.port}`);
  }
  console.log('\n───────────────────────────────────────────────────────────────────');

  let totalRegistros = 0;
  let totalSucessos = 0;
  let totalErros = 0;
  let totalAlterados = 0;

  // Processar cada empresa
  for (const empresa of empresas) {
    console.log(`\n🏢 Processando: ${empresa.nome}`);
    console.log(`   🗄️  ${empresa.config.host}:${empresa.config.database}`);

    // 1. Consultar Firebird
    console.log('   📊 Consultando Firebird...');
    
    let registros;
    try {
      const query = buildQuery(dataExpedicao);
      registros = await queryFirebird(empresa.config, query);
      console.log(`   ✅ ${registros.length} registro(s) encontrado(s)\n`);
    } catch (error) {
      console.error(`   ❌ Erro ao consultar Firebird: ${error.message}`);
      totalErros++;
      continue;
    }

    if (registros.length === 0) {
      console.log('   ⚠️  Nenhum registro para sincronizar.');
      continue;
    }

    totalRegistros += registros.length;

    // 2. Enviar cada registro para a API
    console.log('   📤 Enviando registros para API...\n');

    let primeiroLog = true;
    for (const reg of registros) {
      const payload = {
        data_expedicao: dataExpedicao,
        placa: reg.PLACA?.trim() || 'SEM PLACA',
        praca_codigo: reg.PRACA_CODIGO,
        produto_codigo: reg.PRODUTO_CODIGO,
        total_kg_planejado: parseFloat(reg.TOTAL_KG) || 0,
        kg_troca: parseFloat(reg.TOTAL_TROCA) || 0,
        kg_db: parseFloat(reg.TOTAL_DB) || 0,
        caixas_fechadas: parseInt(reg.CAIXAS_FECHADAS) || 0,
        kg_restante: parseFloat(reg.KG_RESTANTE) || 0,
        fator_embalagem: parseFloat(reg.FATOR_EMBALAGEM) || 0,
        empresa: empresa.nome,
        origem: 'firebird'
      };

      // Log do primeiro payload para debug
      if (primeiroLog) {
        console.log('   📋 Exemplo de payload enviado:');
        console.log(JSON.stringify(payload, null, 2));
        console.log('');
        primeiroLog = false;
      }

      try {
        const resultado = await enviarParaAPI(payload);
        
        if (resultado.ok) {
          totalSucessos++;
          if (resultado.data.changed) {
            totalAlterados++;
            console.log(`     ✅ ${payload.placa} | Praça ${payload.praca_codigo} | Produto ${payload.produto_codigo} → ALTERADO`);
          } else {
            console.log(`     ✓  ${payload.placa} | Praça ${payload.praca_codigo} | Produto ${payload.produto_codigo} → sem alteração`);
          }
        } else {
          totalErros++;
          console.error(`     ❌ ${payload.placa} | Praça ${payload.praca_codigo} | Produto ${payload.produto_codigo} → Erro: ${resultado.data.error}`);
        }
      } catch (error) {
        totalErros++;
        console.error(`     ❌ ${payload.placa} | Praça ${payload.praca_codigo} | Produto ${payload.produto_codigo} → ${error.message}`);
      }
    }
  }

  // 3. Resumo final
  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log('\n📊 Resumo da sincronização:');
  console.log(`   🏢 Empresas processadas: ${empresas.length}`);
  console.log(`   📦 Total de registros: ${totalRegistros}`);
  console.log(`   ✅ Sucessos: ${totalSucessos}`);
  console.log(`   📝 Alterados: ${totalAlterados}`);
  console.log(`   ❌ Erros: ${totalErros}`);
  console.log('\n═══════════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
