import * as admin from 'firebase-admin';

// Função para tentar inicializar o Admin SDK
function initializeAdmin() {
    if (admin.apps.length > 0) return admin.app();

    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
        let credentials;

        // Fallback robusto para parse de JSON (comum dar erro em Vercel/Netlify)
        if (serviceAccount) {
            const tryParse = (str: string) => {
                try {
                    let parsed = JSON.parse(str);
                    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                    return parsed;
                } catch (e) {
                    return null;
                }
            };

            credentials = tryParse(serviceAccount);

            if (!credentials) {
                const flattened = serviceAccount.replace(/\n/g, '').replace(/\r/g, '').trim();
                credentials = tryParse(flattened);
            }

            if (!credentials) {
                let clean = serviceAccount.trim();
                if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
                if (clean.startsWith("'") && clean.endsWith("'")) clean = clean.slice(1, -1);
                credentials = tryParse(clean);
            }
        }

        if (credentials) {
            if (credentials.private_key) {
                credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
                console.log('[FIREBASE ADMIN] Inicializado com sucesso.');
                return admin.initializeApp({
                    credential: admin.credential.cert(credentials)
                });
            } else {
                console.error('[FIREBASE ADMIN] Credenciais sem "private_key". Chaves:', Object.keys(credentials).join(', '));
            }
        } else {
            console.warn('[FIREBASE ADMIN] Nenhuma credencial encontrada.');
        }

        return null;

    } catch (error: any) {
        console.error('[FIREBASE ADMIN] Erro fatal:', error.message);
        return null;
    }
}

const app = initializeAdmin();
export const adminDb = app ? app.firestore() : null as any;
