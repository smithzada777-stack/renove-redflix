import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const { transactionId, status, email } = await req.json();

        if (!transactionId) return NextResponse.json({ error: 'Falta transactionId' }, { status: 400 });

        const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const webhookUrl = `${NEXT_PUBLIC_BASE_URL}/api/webhook/pushinpay`;

        console.log(`[SIMULADOR] Enviando webhook de teste para: ${webhookUrl}`);

        const payload = {
            id: transactionId,
            status: status || 'paid',
            payer_email: email || 'teste@gmail.com'
        };

        const response = await axios.post(webhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        return NextResponse.json({
            success: true,
            message: 'Webhook de SIMULAÇÃO enviado com sucesso!',
            webhook_response: response.data
        });

    } catch (error: any) {
        return NextResponse.json({
            error: 'Erro na simulação',
            details: error.message
        }, { status: 500 });
    }
}
