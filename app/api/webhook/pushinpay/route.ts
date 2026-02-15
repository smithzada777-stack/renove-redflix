import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email';
import querystring from 'querystring';

export async function POST(req: Request) {
    try {
        const bodyText = await req.text();
        const contentType = req.headers.get('content-type') || '';
        let data: any;

        if (contentType.includes('application/json')) {
            try {
                data = JSON.parse(bodyText);
            } catch (e) {
                data = querystring.parse(bodyText);
            }
        } else {
            data = querystring.parse(bodyText);
        }

        console.log('--- [WEBHOOK PUSHINPAY] RECEBIDO ---');
        console.log('Payload:', JSON.stringify(data, null, 2));

        const transactionId = (data.id || data.transaction_id || data.reference || data.external_id || data.reference_id)?.toString().toLowerCase();
        let status = (data.status || data.transaction_status || '').toString().toLowerCase();

        // PushinPay Status Mapping (Garantindo que 'paid' ou 'approved' sejam detectados)
        if (status === '1' || status === 'paid' || status === 'concluido' || status === 'approved') {
            status = 'approved';
        }

        const rawPayerEmail = data.payer_email || data.email || data.payer?.email;
        const payerEmail = rawPayerEmail?.toLowerCase().trim();

        if (!transactionId) {
            console.error('[WEBHOOK] Sem ID de transação no payload.');
            return NextResponse.json({ error: 'ID not found' }, { status: 200 });
        }

        console.log(`[WEBHOOK] Processando ID: ${transactionId} | Status Final: ${status}`);

        if (adminDb) {
            // 1. Atualizar coleção de pagamentos (para o onSnapshot da tela do cliente)
            await adminDb.collection('payments').doc(transactionId).set({
                status: status,
                updated_at: new Date().toISOString(),
                webhook_payload: data
            }, { merge: true });
            console.log(`[WEBHOOK] Pagamento ${transactionId} atualizado para ${status} no Firestore.`);

            // 2. Liberar acesso se aprovado
            const positiveStatuses = ['paid', 'approved', 'confirmed', 'concluido', 'sucesso'];
            if (positiveStatuses.includes(status)) {
                console.log(`[WEBHOOK] Pagamento CONFIRMADO. Buscando lead...`);

                const leadsRef = adminDb.collection('leads');
                // Tenta buscar por transactionId OU por e-mail (fallback)
                let leadDoc: any = null;

                const snapId = await leadsRef.where('transactionId', '==', transactionId).limit(1).get();
                if (!snapId.empty) {
                    leadDoc = snapId.docs[0];
                    console.log(`[WEBHOOK] Lead encontrado por ID de transação: ${leadDoc.id}`);
                } else if (payerEmail) {
                    const snapEmail = await leadsRef.where('email', '==', payerEmail).orderBy('createdAt', 'desc').limit(1).get();
                    if (!snapEmail.empty) {
                        leadDoc = snapEmail.docs[0];
                        console.log(`[WEBHOOK] Lead encontrado por E-mail (Fallback): ${leadDoc.id}`);
                    }
                }

                if (leadDoc) {
                    const leadData = leadDoc.data();
                    const newStatus = leadData.origin === 'renove' || leadData.isRenewal ? 'renewed' : 'approved';

                    await leadDoc.ref.update({
                        status: newStatus,
                        paidAt: new Date().toISOString(),
                        transactionId: transactionId // garante o vinculo
                    });
                    console.log(`[WEBHOOK] Lead ${leadDoc.id} ATUALIZADO para ${newStatus.toUpperCase()}.`);

                    // 3. Enviar E-mail
                    try {
                        await sendEmail({
                            email: leadData.email || payerEmail,
                            plan: leadData.plan || 'Plano RedFlix',
                            price: leadData.price || '0,00',
                            status: 'approved',
                            origin: leadData.origin || 'renove'
                        });
                        console.log(`[WEBHOOK] E-mail enviado para ${leadData.email || payerEmail}`);
                    } catch (err: any) {
                        console.error('[WEBHOOK] Erro no envio de e-mail:', err.message);
                    }
                } else {
                    console.error(`[WEBHOOK] Lead não encontrado para ID ${transactionId} nem E-mail ${payerEmail}`);
                }
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('--- [WEBHOOK] ERRO CRÍTICO ---', error.message);
        return NextResponse.json({ error: 'Internal Error' }, { status: 200 });
    }
}
