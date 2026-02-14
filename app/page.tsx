'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import {
  CheckCircle2, Star, Clock, ShieldCheck,
  Zap, Phone, Mail, QrCode, ArrowLeft,
  Shield, Tv, Film, Headphones, Download, ChevronDown, ChevronUp, Loader2, Copy,
  ChevronRight, Calendar, CreditCard, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, query, where, limit, updateDoc } from 'firebase/firestore';

// --- CONFIGURAÇÃO DE PREÇOS ---
const BASE_PRICE = 29.90;
const PROMO_PLAN_3 = 79.90;
const PROMO_PLAN_6 = 149.90;

const getPlanPrice = (months: number) => {
  if (months === 1) return BASE_PRICE.toFixed(2).replace('.', ',');
  if (months === 3) return PROMO_PLAN_3.toFixed(2).replace('.', ',');
  if (months === 6) return PROMO_PLAN_6.toFixed(2).replace('.', ',');
  return (months * BASE_PRICE).toFixed(2).replace('.', ',');
};

// --- COMPONENTES AUXILIARES ---
const Logo = () => (
  <div className="relative w-48 h-12">
    <Image src="https://i.imgur.com/6H5gxcw.png" alt="RedFlix" fill className="object-contain" priority />
  </div>
);

// --- MAIN CONTENT ---
function RenoveContent() {
  const [step, setStep] = useState<'plans' | 'checkout' | 'pix'>('plans');
  const [selectedPlan, setSelectedPlan] = useState({ months: 1, price: '29,90' });
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [formData, setFormData] = useState({ email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState({ code: '', image: '', id: '' });
  const [isPaid, setIsPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);

  // Timer
  useEffect(() => {
    if (step !== 'pix') return;
    const timer = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Monitoramento de Pagamento
  useEffect(() => {
    if (step !== 'pix' || !pixData.id || isPaid) return;

    const unsub = onSnapshot(doc(db, "payments", pixData.id), (snap) => {
      if (snap.exists() && ['paid', 'approved', 'pago'].includes(snap.data().status?.toLowerCase())) {
        setIsPaid(true);
      }
    });

    const poll = setInterval(async () => {
      try {
        const res = await axios.get(`/api/check-status?id=${pixData.id}`);
        if (res.data.paid) setIsPaid(true);
      } catch (e) { }
    }, 2000);

    return () => { unsub(); clearInterval(poll); };
  }, [step, pixData.id, isPaid]);

  const handleSelectPlan = (months: number) => {
    setSelectedPlan({ months, price: getPlanPrice(months) });
    setStep('checkout');
  };

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.phone) return alert("Preencha todos os campos!");
    if (!formData.email.endsWith('@gmail.com')) return alert("Use um e-mail @gmail.com!");

    setLoading(true);
    try {
      // Salva lead com origin 'renove'
      const leadRef = await addDoc(collection(db, "leads"), {
        email: formData.email,
        phone: formData.phone,
        plan: `${selectedPlan.months} Mês/Meses`,
        price: selectedPlan.price,
        status: 'pending',
        origin: 'renove', // IDENTIFICADOR PARA O DASHBOARD
        createdAt: serverTimestamp()
      });

      const res = await axios.post('/api/payment', {
        amount: selectedPlan.price,
        description: `Renovação - ${selectedPlan.months} Meses`,
        payerEmail: formData.email,
        leadId: leadRef.id
      });

      setPixData({
        code: res.data.qrcode_content,
        image: res.data.qrcode_image_url,
        id: res.data.transaction_id
      });
      setStep('pix');
    } catch (error) {
      alert("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const formatPhone = (v: string) => {
    if (!v) return "";
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    return v.slice(0, 15);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Servidor Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-16">
        <AnimatePresence mode="wait">
          {/* STEP 1: PLANS */}
          {step === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
                  ASSINE OU <span className="text-primary">RENOVE</span> SEU PLANO
                </h1>
                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs md:text-sm shadow-sm">
                  Escolha o período ideal e garanta seu acesso imediato
                </p>
              </div>

              {/* Main 3 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[1, 3, 6].map((m) => (
                  <div
                    key={m}
                    className={`group relative bg-[#0d0d0d] border ${m === 3 ? 'border-primary/50 ring-1 ring-primary/20 scale-105 shadow-2xl shadow-primary/10' : 'border-white/10'} rounded-[2.5rem] p-8 transition-all duration-500 hover:border-primary/40`}
                  >
                    {m === 3 && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-6 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                        Mais Popular
                      </div>
                    )}
                    <div className="text-center mb-8">
                      <h3 className="text-gray-400 text-xs font-black uppercase tracking-[0.3em] mb-4">{m} {m === 1 ? 'Mês' : 'Meses'}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-2xl font-black text-primary/50 italic">R$</span>
                        <span className="text-7xl font-black text-white italic tracking-tighter">{getPlanPrice(m).split(',')[0]}</span>
                        <span className="text-2xl font-black text-white/30 italic">,{getPlanPrice(m).split(',')[1]}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectPlan(m)}
                      className="w-full bg-primary hover:bg-primary-hover py-5 rounded-2xl font-black italic tracking-tighter text-xl transition-all shadow-lg active:scale-95"
                    >
                      {m === 1 ? 'RENOVAR' : 'ASSINAR COM DESCONTO'}
                    </button>
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <CheckCircle2 size={14} className="text-primary" />
                        <span>Acesso 4K Ultra HD</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <CheckCircle2 size={14} className="text-primary" />
                        <span>Sem fidelidade</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Other Plans Button */}
              <div className="text-center">
                <button
                  onClick={() => setShowAllPlans(!showAllPlans)}
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-all font-black uppercase tracking-widest text-xs border border-white/5 px-8 py-4 rounded-full bg-white/5"
                >
                  Ver Outros Planos (1 a 12 meses)
                  {showAllPlans ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Expanding Grid for all 12 months */}
              <AnimatePresence>
                {showAllPlans && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-8"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <button
                          key={m}
                          onClick={() => handleSelectPlan(m)}
                          className="bg-[#0a0a0a] border border-white/5 p-4 rounded-2xl hover:border-primary/50 transition-all text-center group"
                        >
                          <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{m} {m === 1 ? 'Mês' : 'Meses'}</span>
                          <span className="block text-xl font-black text-white group-hover:text-primary">R$ {getPlanPrice(m)}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP 2: CHECKOUT */}
          {step === 'checkout' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto"
            >
              <button onClick={() => setStep('plans')} className="mb-8 flex items-center gap-2 text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                <ArrowLeft size={16} /> Voltar para os planos
              </button>

              <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="bg-primary/10 p-8 border-b border-white/5 text-center">
                  <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Resumo da Renovação</h3>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Plano de {selectedPlan.months} {selectedPlan.months === 1 ? 'Mês' : 'Meses'}</h2>
                  <div className="mt-4 text-4xl font-black text-primary italic tracking-widest">R$ {selectedPlan.price}</div>
                </div>

                <form className="p-8 space-y-6" onSubmit={handleGeneratePix}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">E-mail (@gmail.com)</label>
                      <div className="relative group">
                        <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" />
                        <input
                          type="email"
                          required
                          className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                          placeholder="seu@gmail.com"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">WhatsApp (DDD + Número)</label>
                      <div className="relative group">
                        <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" />
                        <input
                          type="tel"
                          required
                          className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                          placeholder="(00) 00000-0000"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-hover h-20 rounded-2xl font-black italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <>GERAR PAGAMENTO <ChevronRight /></>}
                  </button>

                  <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2"><Shield size={12} /> Seguro</div>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <div className="flex items-center gap-2"><QrCode size={12} /> Pix Imediato</div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PIX PAYMENT */}
          {step === 'pix' && (
            <motion.div
              key="pix"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-[#0f0f0f] border-2 border-primary/20 rounded-[3rem] overflow-hidden shadow-2xl relative">
                {isPaid ? (
                  <div className="p-12 text-center space-y-8 min-h-[500px] flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                      <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter">SUCESSO!</h2>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto">
                      Seu pagamento foi confirmado. Seu acesso foi renovado automaticamente em nosso sistema!
                    </p>
                    <button onClick={() => window.location.reload()} className="bg-white text-black font-black px-10 py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                      Fazer outra renovação
                    </button>
                  </div>
                ) : (
                  <div className="p-8 md:p-12 text-center">
                    <div className="mb-8 flex items-center justify-center gap-3 text-primary animate-pulse">
                      <Clock size={20} />
                      <span className="text-3xl font-black font-mono italic">{formatTime(timeLeft)}</span>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] inline-block shadow-2xl border-4 border-primary/10 mb-8">
                      <img
                        src={pixData.image.startsWith('data:') ? pixData.image : `data:image/png;base64,${pixData.image}`}
                        alt="QR Code"
                        className="w-72 h-72 md:w-80 md:h-80 object-contain mx-auto"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="bg-black border border-white/5 rounded-2xl p-4 text-[10px] text-gray-500 font-mono break-all line-clamp-2">
                        {pixData.code}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.code);
                          alert("Código Copiado!");
                        }}
                        className="w-full bg-primary hover:bg-primary-hover py-6 rounded-2xl font-black italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
                      >
                        <Copy /> COPIAR CÓDIGO PIX
                      </button>
                      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-4">
                        Após o pagamento ser identificado, esta tela atualizará automaticamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center mt-12 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.8em]">RedFlix 2026 • Renove seu Acesso</p>
      </footer>
    </div>
  );
}

export default function RenovePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    }>
      <RenoveContent />
    </Suspense>
  );
}
