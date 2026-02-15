import 'dotenv/config';
import axios from 'axios';
import { adminDb } from './lib/firebaseAdmin.js'; // Note: might need to fix paths for local execution

async function runTest() {
    console.log('🚀 INICIANDO TESTE COMPLETO DO SISTEMA...');

    const testEmail = `teste.${Date.now()}@gmail.com`;
    const testPhone = '(71) 99999-9999';
    const amount = '29,90';

    try {
        // 1. CRIAR LEAD
        console.log('1. Criando lead de teste...');
        const leadRef = await adminDb.collection('leads').add({
            email: testEmail,
            phone: testPhone,
            plan: '1 Mês (Teste)',
            price: amount,
            status: 'pending',
            origin: 'renove',
            createdAt: new Date()
        });
        const leadId = leadRef.id;
        console.log(`✅ Lead criado: ${leadId}`);

        // 2. GERAR PAGAMENTO (Simula a chamada da API)
        console.log('2. Gerando código Pix...');
        const PORT = process.env.PORT || 3000;
        const resPayment = await axios.post(`http://localhost:${PORT}/api/payment`, {
            amount,
            description: 'Teste de Renovação',
            payerEmail: testEmail,
            leadId,
            origin: 'renove'
        });

        const transactionId = resPayment.data.transaction_id;
        console.log(`✅ Pix gerado. ID Transação: ${transactionId}`);

        // 3. SIMULAR WEBHOOK (O momento da verdade)
        console.log('3. Simulando Webhook de pagamento aprovado...');
        await axios.post(`http://localhost:${PORT}/api/webhook/pushinpay`, {
            id: transactionId,
            status: 'paid',
            payer_email: testEmail
        });
        console.log('✅ Webhook enviado.');

        // 4. VERIFICAR RESULTADOS NO BANCO
        console.log('4. Verificando resultados no Firestore...');

        // Espera um pouco para o processamento assíncrono
        await new Promise(r => setTimeout(r, 2000));

        const paymentDoc = await adminDb.collection('payments').doc(transactionId).get();
        const leadDoc = await adminDb.collection('leads').doc(leadId).get();

        const paymentStatus = paymentDoc.data()?.status;
        const leadStatus = leadDoc.data()?.status;

        console.log('--- RESULTADOS ---');
        console.log(`Status do Pagamento: ${paymentStatus} ${paymentStatus === 'approved' ? '✅' : '❌'}`);
        console.log(`Status do Lead: ${leadStatus} ${leadStatus === 'renewed' ? '✅' : '❌'}`);

        if (paymentStatus === 'approved' && leadStatus === 'renewed') {
            console.log('\n🌟 TESTE BEM SUCEDIDO! O sistema está funcionando 100%.');
        } else {
            console.log('\n⚠️ TESTE FALHOU. Verifique os logs do servidor para detalhes.');
        }

    } catch (error) {
        console.error('❌ ERRO DURANTE O TESTE:', error.message);
        if (error.response) console.error('Resposta do server:', error.response.data);
    }
}

runTest();
