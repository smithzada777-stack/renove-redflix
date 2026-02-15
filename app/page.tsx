'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2, Clock, ShieldCheck,
  Zap, Phone, Mail, QrCode, ArrowLeft,
  Shield, Tv, Film, Headphones, Loader2, Copy,
  Users, X, Calendar, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, query, where, limit } from 'firebase/firestore';

// --- CONFIGURAÇÃO DE PREÇOS ---
const BASE_PRICE = 29.90;
const PROMO_PLAN_3 = 79.90;
const PROMO_PLAN_6 = 149.90;

const getPlanPrice = (months: number) => {
  if (months === 1) return BASE_PRICE.toFixed(2).replace('.', ',');
  if (months === 3) return PROMO_PLAN_3.toFixed(2).replace('.', ',');
  if (months === 6) return PROMO_PLAN_6.toFixed(2).replace('.', ',');

  let discount = 0;
  if (months >= 12) discount = 0.25;
  else if (months >= 9) discount = 0.20;

  const total = months * BASE_PRICE * (1 - discount);
  return total.toFixed(2).replace('.', ',');
};

const Logo = () => (
  <div className="relative w-44 h-10">
    <img src="https://i.imgur.com/6H5gxcw.png" alt="RedFlix Renove" className="object-contain w-full h-full" />
  </div>
);

export default function RenovePage() {
  const [step, setStep] = useState<'plans' | 'checkout' | 'pix'>('plans');
  const [selectedPlan, setSelectedPlan] = useState({ months: 1, price: '29,90' });
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [formData, setFormData] = useState({ email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState({ code: '', image: '', id: '' });
  const [isPaid, setIsPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos

  // Timer do Pix
  useEffect(() => {
    if (step === 'pix' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  // Monitorar Pagamento
  useEffect(() => {
    if (step === 'pix' && pixData.id) {
      const unsub = onSnapshot(doc(db, "payments", pixData.id.toLowerCase()), (snap) => {
        if (snap.exists() && ['paid', 'approved', 'concluido'].includes(snap.data().status?.toLowerCase())) {
          setIsPaid(true);
        }
      });
      return () => unsub();
    }
  }, [step, pixData.id]);

  const handlePlanSelect = (months: number) => {
    setSelectedPlan({ months, price: getPlanPrice(months) });
    setStep('checkout');
    setShowAllPlans(false);
  };

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.phone) return alert("Preencha todos os campos!");
    const cleanEmail = formData.email.toLowerCase().trim();
    if (!cleanEmail.endsWith('@gmail.com')) return alert("Use um e-mail @gmail.com oficial!");

    setLoading(true);
    try {
      const leadRef = await addDoc(collection(db, "leads"), {
        email: cleanEmail,
        phone: formData.phone,
        plan: `${selectedPlan.months} Mês/Meses (Renovação)`,
        price: selectedPlan.price,
        status: 'pending',
        origin: 'renove',
        createdAt: serverTimestamp()
      });

      const res = await axios.post('/api/payment', {
        amount: selectedPlan.price,
        description: `Renovação - ${selectedPlan.months} Meses`,
        payerEmail: cleanEmail,
        leadId: leadRef.id,
        origin: 'renove'
      });

      setPixData({
        code: res.data.qrcode_content,
        image: res.data.qrcode_image_url,
        id: res.data.transaction_id
      });
      setStep('pix');
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar pagamento. Tente novamente.");
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

  const mainPlans = [
    { months: 1, price: '29,90', oldPrice: '39,90', highlight: false, desc: 'Plano Individual' },
    {
      months: 3,
      price: '79,90',
      oldPrice: '89,70',
      highlight: true,
      desc: 'Mais Vendido',
      bonus: ['Canais Adultos', 'Canais ao Vivo', '+9.000 Filmes', 'Sem Travamentos', 'Resgate Imediato']
    },
    { months: 6, price: '149,90', oldPrice: '179,40', highlight: false, desc: 'Plano Familiar' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600/30 font-sans overflow-x-hidden">
      {/* Header */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-[60]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 bg-red-600/10 text-red-600 px-3 py-1.5 rounded-full border border-red-600/20">
            <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sistema Ativo</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">

          {/* STEP 1: PLANS */}
          {step === 'plans' && (
            <motion.div
              key="plans"
              className="space-y-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                  <span className="text-red-600">RENOVE</span> ou <span className="text-red-600">ATIVE</span> seu plano
                </h1>
                <p className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">Escolha uma opção para continuar</p>
              </div>

              {/* Grid de "Mini Quadrados" */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {mainPlans.map((p, i) => (
                  <motion.div
                    key={i}
                    onClick={() => handlePlanSelect(p.months)}
                    className={`cursor-pointer group relative rounded-3xl p-8 flex flex-col items-center justify-between transition-all duration-300 border-2 ${p.highlight
                        ? 'bg-[#0a0a0a] border-red-600 shadow-[0_0_40px_rgba(229,9,20,0.1)] scale-105 z-10'
                        : 'bg-[#080808] border-white/5 hover:border-white/10'
                      }`}
                  >
                    <div className="text-center space-y-4 w-full">
                      <h3 className="text-xl font-black italic uppercase tracking-widest text-white">{p.months} {p.months === 1 ? 'MÊS' : 'MESES'}</h3>

                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 line-through font-bold italic">R$ {p.oldPrice}</p>
                        <p className="text-5xl font-black italic text-white group-hover:text-red-600 transition-colors">R$ {p.price}</p>
                      </div>

                      {p.bonus && (
                        <div className="space-y-2 py-4 border-t border-white/5 w-full flex flex-col items-center">
                          {p.bonus.map((b, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-tight">
                              <CheckCircle2 size={12} className="text-red-600" /> {b}
                            </div>
                          ))}
                        </div>
                      )}

                      {!p.bonus && (
                        <div className="space-y-2 py-4 border-t border-white/5 w-full">
                          <div className="flex items-center justify-center gap-2 text-[9px] font-black text-gray-600 uppercase tracking-tight">
                            <CheckCircle2 size={12} className="text-red-600/50" /> Suporte Premium
                          </div>
                        </div>
                      )}
                    </div>

                    <button className={`w-full py-4 mt-6 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all ${p.highlight ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white'
                      }`}>
                      Selecionar
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowAllPlans(true)}
                  className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-red-600/50 transition-all flex items-center gap-3 mx-auto"
                >
                  <Calendar size={14} className="text-red-600" /> Explorar Outros Períodos
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CHECKOUT */}
          {step === 'checkout' && (
            <motion.div
              key="checkout"
              className="max-w-md mx-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative">
                <button onClick={() => setStep('plans')} className="text-gray-600 hover:text-white transition-colors flex items-center gap-2 text-[9px] font-black uppercase tracking-widest mb-8">
                  <ArrowLeft size={14} /> Voltar
                </button>

                <div className="text-center space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Checkout <span className="text-red-600">Seguro</span></h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Acesso liberado após o pagamento</p>
                  </div>

                  <div className="bg-black/50 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[9px] text-red-600 font-black uppercase tracking-widest">Plano Renovação</p>
                      <p className="text-xl font-black italic text-white uppercase">{selectedPlan.months} MESES</p>
                    </div>
                    <p className="text-3xl font-black text-white italic">R$ {selectedPlan.price}</p>
                  </div>

                  <form className="space-y-6" onSubmit={handleGeneratePix}>
                    <div className="space-y-4">
                      <div className="relative group text-left">
                        <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-4 mb-2 block">Seu E-mail (@gmail.com)</label>
                        <div className="relative">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-red-600 transition-colors" size={18} />
                          <input
                            type="email"
                            required
                            placeholder="seuemail@gmail.com"
                            className="w-full bg-[#050505] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-red-600 transition-all font-bold"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="relative group text-left">
                        <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-4 mb-2 block">WhatsApp de Suporte</label>
                        <div className="relative">
                          <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-red-600 transition-colors" size={18} />
                          <input
                            type="tel"
                            required
                            placeholder="(00) 00000-0000"
                            className="w-full bg-[#050505] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-red-600 transition-all font-bold"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-red-600 hover:bg-red-700 h-18 rounded-2xl font-black italic tracking-tighter text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-600/20"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <>GERAR CÓDIGO PIX <ChevronRight size={20} /></>}
                    </button>

                    <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/5">
                      <img src="https://i.imgur.com/LgBsB9x.png" alt="Pix" className="h-6 grayscale opacity-50" />
                      <div className="h-4 w-px bg-white/10" />
                      <div className="flex items-center gap-2 opacity-50">
                        <ShieldCheck size={14} className="text-white" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Pagamento Seguro</span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PIX PAYMENT */}
          {step === 'pix' && (
            <motion.div
              key="pix"
              className="max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {isPaid ? (
                <div className="bg-[#0a0a0a] border-2 border-green-500/30 rounded-[3rem] p-10 text-center space-y-8 shadow-2xl overflow-hidden">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 blur-[60px] rounded-full" />
                    <CheckCircle2 size={80} className="text-green-500 mx-auto relative z-10" />
                  </div>
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">PAGO COM <br /><span className="text-green-500 text-5xl">SUCESSO!</span></h2>
                  <p className="text-sm text-gray-400 font-medium">Seu acesso foi liberado e as instruções foram enviadas para seu e-mail.</p>

                  <a href="https://wa.me/5571991644164" target="_blank" className="w-full bg-green-600 hover:bg-green-700 h-18 rounded-2xl font-black italic tracking-tighter text-xl flex items-center justify-center gap-3 transition-all shadow-xl">
                    FALAR NO WHATSAPP <ChevronRight size={20} />
                  </a>
                </div>
              ) : (
                <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="bg-red-600/5 p-8 text-center border-b border-white/5">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] animate-pulse">Aguardando Pagamento...</p>
                    <p className="text-3xl font-black italic text-white mt-1">{formatTime(timeLeft)}</p>
                  </div>

                  <div className="p-8 space-y-8 text-center">
                    <div className="bg-white p-5 rounded-3xl inline-block border-4 border-red-600/20">
                      <img src={pixData.image} alt="QR Code" className="w-52 h-52" />
                    </div>

                    <div className="space-y-4">
                      <div className="bg-black/80 border border-white/10 p-5 rounded-2xl text-[10px] font-mono text-gray-500 break-all leading-relaxed" onClick={() => { navigator.clipboard.writeText(pixData.code); alert("Copiado!"); }}>
                        {pixData.code}
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(pixData.code); alert("Copiado!"); }} className="w-full bg-red-600 text-white h-16 rounded-2xl font-black italic tracking-tighter text-lg flex items-center justify-center gap-3 shadow-xl">
                        <Copy size={20} /> COPIAR CÓDIGO PIX
                      </button>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <Mail size={16} className="text-red-600" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{formData.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MODAL: TODOS OS PLANOS */}
      <AnimatePresence>
        {showAllPlans && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAllPlans(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative w-full max-w-4xl bg-[#0a0a0a] rounded-[2.5rem] border border-white/10 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/40">
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">MAIS <span className="text-red-600">OPÇÕES</span></h2>
                <button onClick={() => setShowAllPlans(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 9, 12].map(m => (
                    <div key={m} onClick={() => handlePlanSelect(m)} className="bg-black/50 border border-white/5 p-6 rounded-[2rem] hover:border-red-600/50 transition-all cursor-pointer group flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <p className="text-lg font-black italic text-white uppercase">{m} {m === 1 ? 'MÊS' : 'MESES'}</p>
                          <Calendar size={14} className="text-red-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-3xl font-black italic text-white group-hover:text-red-600 transition-colors">R$ {getPlanPrice(m)}</p>
                          <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">R$ {(parseFloat(getPlanPrice(m).replace(',', '.')) / m).toFixed(2).replace('.', ',')} mensal</p>
                        </div>
                      </div>
                      <div className="mt-6 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black uppercase text-gray-500 group-hover:bg-red-600 group-hover:text-white transition-all">Selecionar</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-white/5 bg-black/80 flex justify-between items-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-700">Taxas inclusas no valor final</p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-600">
                  <ShieldCheck size={14} /> Pagamento Blindado
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-20 border-t border-red-600/10 bg-[#020202]">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-8">
          <Logo />
          <div className="flex flex-wrap justify-center gap-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">
            <a href="#" className="hover:text-red-600 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-red-600 transition-colors">Termos</a>
            <a href="#" className="hover:text-red-600 transition-colors">Suporte</a>
          </div>
          <p className="text-[9px] text-gray-800 font-bold uppercase tracking-[0.6em]">RedFlix Renove © 2026 • Premium Experience</p>
        </div>
      </footer>
    </div>
  );
}
