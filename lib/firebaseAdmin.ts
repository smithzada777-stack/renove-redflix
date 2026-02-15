import * as admin from 'firebase-admin';

// Função para tentar inicializar o Admin SDK
function initializeAdmin() {
    if (admin.apps.length > 0) return admin.app();

    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccount) {
            console.warn('[FIREBASE ADMIN] Variável FIREBASE_SERVICE_ACCOUNT não encontrada.');
            return null;
        }

        let credentials: any;
        try {
            // Tenta parse direto
            credentials = JSON.parse(serviceAccount);
        } catch (e) {
            try {
                // Tenta limpar possíveis aspas extras (comum em .env)
                let clean = serviceAccount.trim();
                if (clean.startsWith("'") || clean.startsWith('"')) clean = clean.slice(1, -1);
                credentials = JSON.parse(clean);
            } catch (e2) {
                console.error('[FIREBASE ADMIN] Erro ao processar JSON das credenciais.');
                return null;
            }
        }

        if (credentials && credentials.private_key) {
            // Corrige quebras de linha que o .env pode ter escapado
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

            console.log('[FIREBASE ADMIN] Inicializado com sucesso para projeto:', credentials.project_id);
            return admin.initializeApp({
                credential: admin.credential.cert(credentials)
            });
        }

        console.error('[FIREBASE ADMIN] private_key não encontrada no JSON. Chaves presentes:', Object.keys(credentials || {}).join(', '));
        return null;

    } catch (error: any) {
        console.error('[FIREBASE ADMIN] Erro fatal na inicialização:', error.message);
        return null;
    }
}

const app = initializeAdmin();
export const adminDb = app ? app.firestore() : null as any;
