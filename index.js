require('dotenv').config();

const VPS_API_URL = process.env.VPS_API_URL;
const VPS_API_KEY = process.env.VPS_API_KEY;

// Validar variáveis de ambiente
if (!VPS_API_URL) {
  console.error('❌ Erro: VPS_API_URL não definida');
  process.exit(1);
}

if (!VPS_API_KEY) {
  console.error('❌ Erro: VPS_API_KEY não definida');
  process.exit(1);
}

// Payload fixo de teste
const payload = {
  data_expedicao: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
  placa: 'ABC1234',
  praca_codigo: 1,
  produto_codigo: 1,
  total_kg_planejado: 1500.50
};

async function enviarExpedicao() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 Agent ERP Sync - Teste de Integração');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📡 URL:', VPS_API_URL);
  console.log('🔑 API Key:', VPS_API_KEY.substring(0, 8) + '...');
  console.log('\n📦 Payload enviado:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n───────────────────────────────────────────────────────');

  try {
    const response = await fetch(VPS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VPS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ Resposta do servidor (HTTP ' + response.status + '):');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n📊 Resumo:');
      console.log('   - ok:', data.ok);
      console.log('   - changed:', data.changed);
    } else {
      console.error('\n⚠️ Erro HTTP ' + response.status + ':');
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Erro de conexão:');
    console.error('   Mensagem:', error.message);
    
    if (error.cause) {
      console.error('   Causa:', error.cause.code || error.cause.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
}

enviarExpedicao();
