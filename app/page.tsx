'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  CheckCircle2, Star, Clock, ShieldCheck,
  Zap, Phone, Mail, QrCode, ArrowLeft,
  Shield, Tv, Film, Headphones, Download, ChevronRight, Loader2, Copy, Users, X, Calendar, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, query, where, limit, updateDoc } from 'firebase/firestore';

const formatPhone = (v: string) => {
  if (!v) return "";
  v = v.replace(/\D/g, "");
  v = v.replace(/(\d{2})(\d)/, "($1) $2");
  v = v.replace(/(\d{5})(\d)/, "$1-$2");
  return v.slice(0, 15);
};

const isValidGmail = (e: string) => e.toLowerCase().endsWith('@gmail.com');

const plans = [
  {
    id: 1,
    months: 1,
    period: '1 Mês',
    price: '29,90',
    oldPrice: '39,90',
    subtext: 'Plano Mensal (Completo)',
    highlight: false,
    users: 1257
  },
  {
    id: 2,
    months: 3,
    period: '3 Meses',
    price: '79,90',
    oldPrice: '89,70',
    save: '11%',
    highlight: true,
    users: 4345
  },
  {
    id: 3,
    months: 6,
    period: '6 Meses',
    price: '149,90',
    oldPrice: '179,40',
    save: '16%',
    highlight: false,
    users: 1570
  },
];

const getPlanPrice = (months: number) => {
  if (months === 1) return '29,90';
  if (months === 3) return '79,90';
  if (months === 6) return '149,90';
  const base = 29.90;
  let discount = 0;
  if (months >= 12) discount = 0.25;
  else if (months >= 9) discount = 0.20;
  const total = months * base * (1 - discount);
  return total.toFixed(2).replace('.', ',');
};

const testimonials = [
  { name: 'Lucas Rocha', text: 'Acabei de pagar e o email chegou na hora. Impressionante a velocidade!' },
  { name: 'Amanda Lima', text: 'Não acreditava que era vitalício mesmo, mas usei o suporte e confirmaram tudo. 10/10.' },
  { name: 'Roberto Castro', text: 'Qualidade da imagem no 4K é superior a muitos que já usei. Melhor custo benefício.' },
  { name: 'Patrícia Gomes', text: 'Configurei no meu celular e na TV da sala sem dor de cabeça. Muito prático.' },
];

const Logo = () => (
  <div className="relative w-40 h-10">
    <img src="https://i.imgur.com/6H5gxcw.png" alt="RedFlix" className="object-contain w-full h-full" />
  </div>
);

export default function RenovePage() {
  const [step, setStep] = useState<'plans' | 'checkout' | 'pix'>('plans');
  const [selectedPlan, setSelectedPlan] = useState(plans[1]);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [formData, setFormData] = useState({ email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState({ code: '', image: '', id: '' });
  const [isPaid, setIsPaid] = useState(false);
  const [surpriseStep, setSurpriseStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
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
        plan: `${selectedPlan.period} (Renovação)`,
        price: selectedPlan.price,
        status: 'pending',
        origin: 'renove',
        createdAt: serverTimestamp()
      });

      const res = await axios.post('/api/payment', {
        amount: selectedPlan.price,
        description: `Renovação - ${selectedPlan.period}`,
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

      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      await delay(100); setSurpriseStep(1);
      await delay(600); setSurpriseStep(2);
      await delay(600); setSurpriseStep(3);
      await delay(600); setSurpriseStep(4);

    } catch (error) {
      console.error(error);
      alert("Erro ao gerar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sc = s % 60;
    return `${m}:${sc < 10 ? '0' : ''}${sc}`;
  };

  const surpriseContent = [
    { icon: Film, text: "9.000+ Filmes e Séries Liberados", color: "text-green-500" },
    { icon: Tv, text: "3 Telas Ultra HD 4K Configuradas", color: "text-green-500" },
    { icon: Zap, text: "Tecnologia Anti-Travamento Ativada", color: "text-green-500" },
    { icon: ShieldCheck, text: "Acesso Vitalício ao Suporte VIP", color: "text-green-500" }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30 overflow-x-hidden">

      {/* 🔴 Top Urgency Bar */}
      <div className={`bg-primary py-3 px-4 sticky top-0 z-[60] flex items-center justify-center gap-3 shadow-[0_4px_30px_rgba(229,9,20,0.6)] ${step === 'plans' ? 'hidden' : ''}`}>
        <Clock size={18} className="animate-pulse text-white" />
        <p className="text-[11px] md:text-sm font-black uppercase tracking-[0.25em] text-white text-center">
          SEU DESCONTO EXPIRA EM: <span className="text-white text-lg md:text-xl ml-2 font-black italic">{formatTime(timeLeft)}</span>
        </p>
      </div>

      {/* Header Navigation */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          {step !== 'plans' ? (
            <button onClick={() => setStep('plans')} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Voltar</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sistema de Renovação</span>
            </div>
          )}

          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            {step !== 'plans' ? (
              <button onClick={() => setStep('plans')} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Voltar</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sistema de Renovação</span>
              </div>
            )}

            {step === 'plans' ? <Logo /> : (
              <div className="flex flex-col items-end">
                <span className="text-[12px] font-black italic text-primary uppercase tracking-tighter">RENOVAÇÃO VIP</span>
                <span className="text-[7px] text-gray-600 font-bold uppercase tracking-[0.3em]">PROCESSO SEGURO</span>
              </div>
            )}
          </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">

          {/* STEP 1: PLANS */}
          {step === 'plans' && (
            <motion.div key="plans" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-16">
              <div className="text-center space-y-6 max-w-2xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                  <span className="text-primary">RENOVE</span> ou <span className="text-primary">ATIVE</span> <br /> seu plano
                </h1>
                <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">Escolha seu período e garanta seu acesso</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr_280px] gap-4 md:gap-3 max-w-6xl mx-auto items-center">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`group relative rounded-[2.5rem] flex flex-col transition-all duration-500 border ${plan.highlight
                      ? 'border-primary/50 bg-[#121212] shadow-[0_25px_80px_rgba(229,9,20,0.25)] py-8 px-6 md:py-10 md:px-8 z-20 scale-[1.05]'
                      : 'border-white/10 bg-[#0d0d0d] py-6 px-5 md:py-6 md:px-5 z-10 opacity-75 scale-95 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
                      }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-primary/30 flex items-center gap-2 whitespace-nowrap z-30">
                        <Zap size={12} fill="white" />
                        <span>RECOMENDADO</span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h3 className={`text-[10px] uppercase tracking-[0.2em] font-black mb-3 ${plan.highlight ? 'text-primary' : 'text-gray-500'}`}>
                        {plan.period}
                      </h3>

                      <div className={`flex flex-col items-center justify-center ${plan.highlight ? 'min-h-[110px]' : 'min-h-[80px]'}`}>
                        <div className="h-5">
                          {plan.oldPrice && (
                            <span className="text-gray-600 line-through text-md font-bold opacity-50 italic">
                              R$ {plan.oldPrice}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className={`font-bold italic ${plan.highlight ? 'text-xl text-primary/50' : 'text-lg text-white/30'}`}>R$</span>
                          <span className={`font-black italic tracking-tighter ${plan.highlight
                            ? 'text-6xl md:text-7xl text-primary drop-shadow-[0_0_20px_rgba(229,9,20,0.4)]'
                            : 'text-4xl md:text-5xl text-white'
                            }`}>
                            {plan.price.split(',')[0]}
                          </span>
                          <span className={`font-bold italic ${plan.highlight ? 'text-xl text-primary/50' : 'text-lg text-white/30'}`}>
                            ,{plan.price.split(',')[1]}
                          </span>
                        </div>
                      </div>
                    </div>

                    {plan.highlight && (
                      <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-primary to-transparent mb-6" />
                    )}

                    <div className={`flex items-center justify-center ${plan.highlight ? 'mb-8 min-h-[40px]' : 'mb-4 min-h-[20px]'}`}>
                      {plan.save ? (
                        <div className="bg-green-500/10 px-4 py-1.5 rounded-lg border border-green-500/20">
                          <p className="text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                            </span>
                            Economize {plan.save}
                          </p>
                        </div>
                      ) : plan.subtext ? (
                        <p className="text-gray-600 text-[9px] font-bold uppercase tracking-wider">{plan.subtext}</p>
                      ) : null}
                    </div>

                    <div className="mt-auto space-y-4">
                      <div className={`flex items-center justify-center transition-all ${plan.highlight
                        ? 'bg-black/30 p-4 gap-3 rounded-2xl border border-white/5'
                        : 'bg-transparent p-1 gap-1.5'
                        }`}>
                        <div className={`${plan.highlight ? 'bg-primary/20 text-primary p-2 rounded-lg' : 'text-gray-600'}`}>
                          <Users size={plan.highlight ? 18 : 14} />
                        </div>
                        <div className={plan.highlight ? 'text-left' : 'flex items-center'}>
                          <span className="text-white/80 font-black text-xs block">+{plan.users.toLocaleString()} Ativos</span>
                          {plan.highlight && <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest leading-none">Clientes satisfeitos</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => handlePlanSelect(plan)}
                        className={`group h-12 md:h-14 w-full rounded-xl font-black text-sm italic uppercase flex items-center justify-center gap-2 transition-all duration-500 relative overflow-hidden ${plan.highlight
                          ? 'bg-primary text-white shadow-[0_10px_30px_rgba(229,9,20,0.3)] hover:scale-[1.02]'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
                          }`}>
                        <span className="relative z-10">{plan.highlight ? 'Quero agora' : 'Assinar'}</span>
                        <ChevronRight size={16} className={`relative z-10 transition-transform duration-500 group-hover:translate-x-1 ${plan.highlight ? 'text-white' : 'text-primary'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-8">
                <button onClick={() => setShowAllPlans(true)} className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all group shadow-2xl">
                  <Calendar className="text-primary group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-white">Explorar Outros Períodos</span>
                  <ChevronRight size={18} className="text-primary group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 & 3: CHECKOUT */}
          {(step === 'checkout' || step === 'pix') && (
            <motion.div key="checkout-step" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto relative">
              <div className="text-center mb-12 space-y-3">
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                  FINALIZAÇÃO DO <br /><span className="text-primary">ACESSO VIP</span>
                </h1>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-[0.2em] px-4">Preencha seus dados reais para receber o código de ativação instantaneamente.</p>
              </div>

              <div className="bg-[#0f0f0f] border-2 border-primary/20 rounded-[3rem] shadow-[0_0_100px_rgba(229,9,20,0.15)] relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

                <div className="relative z-10">
                  {(!isPaid) && (
                    <div className="bg-black/50 border-b border-white/5 p-6 md:p-8 text-center bg-gradient-to-b from-primary/10 to-transparent">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Resumo do seu Plano</p>
                      </div>
                      <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-white">{selectedPlan.period}</h3>
                      <div className="mt-4 md:mt-6 flex items-baseline justify-center gap-2">
                        <span className="text-3xl md:text-4xl font-black text-primary italic leading-none">R$</span>
                        <span className="text-6xl md:text-7xl font-black text-white italic tracking-tighter leading-none">{selectedPlan.price}</span>
                      </div>
                      <div className="mt-3 md:mt-4 inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                        <CheckCircle2 size={10} className="text-green-500" />
                        <span className="text-[8px] md:text-[9px] text-green-500 font-black uppercase tracking-widest">Ativação Instantânea</span>
                      </div>
                    </div>
                  )}

                  <div className="p-6 md:p-10">
                    <AnimatePresence mode="wait">
                      {isPaid ? (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
                          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                            <CheckCircle2 size={40} className="text-green-500" />
                          </div>
                          <h2 className="text-3xl font-black italic uppercase tracking-widest text-white">RENOVADO COM SUCESSO!</h2>
                          <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                              Identificamos seu pagamento! Seus dados de acesso foram enviados agora mesmo para o e-mail:
                              <span className="block text-white font-bold mt-2 bg-white/5 py-3 rounded-xl border border-white/5">{formData.email}</span>
                            </p>
                          </div>
                          <div className="flex flex-col gap-3">
                            <a href="https://wa.me/5571991644164" target="_blank" className="w-full bg-green-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2">
                              <Headphones size={14} /> RESGATAR ACESSO (WHATSAPP)
                            </a>
                            <button onClick={() => setStep('plans')} className="text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors">Voltar para Início</button>
                          </div>
                        </motion.div>
                      ) : step === 'checkout' ? (
                        <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                          <form className="space-y-6" onSubmit={handleGeneratePix}>
                            <div className="space-y-5">
                              <div className="space-y-2">
                                <label className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] ml-4">Seu melhor E-mail</label>
                                <div className="relative group">
                                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-primary transition-colors" />
                                  <input
                                    type="email" required placeholder="apenas @gmail.com"
                                    className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] ml-4">WhatsApp (DDD + Número)</label>
                                <div className="relative group">
                                  <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-primary transition-colors" />
                                  <input
                                    type="tel" required placeholder="(00) 90000-0000"
                                    className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                  />
                                </div>
                              </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-hover text-white font-black py-6 rounded-2xl flex flex-col items-center justify-center transition-all transform active:scale-[0.98] shadow-[0_20px_60px_rgba(229,9,20,0.4)] group relative overflow-hidden disabled:opacity-50">
                              <div className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? <Loader2 size={24} className="animate-spin" /> : (
                                  <>
                                    <QrCode size={24} />
                                    <span className="text-2xl italic tracking-tighter uppercase">GERAR PIX AGORA</span>
                                  </>
                                )}
                              </div>
                              {!loading && <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.4em] mt-1 opacity-70">Entrega Automática</span>}
                            </button>
                          </form>
                        </motion.div>
                      ) : (
                        <motion.div key="pix" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Seu tempo para pagar:</p>
                            <div className="text-3xl font-black italic text-primary animate-pulse">{formatTime(timeLeft)}</div>
                          </div>

                          <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl mb-6 relative overflow-hidden border-4 border-primary/20">
                            <img src={pixData.image} alt="QR Code Pix" className="w-72 h-72 object-contain mx-auto" />
                            <p className="text-[10px] text-gray-800 font-black uppercase tracking-widest mt-4 italic">Escaneie para Liberar Agora</p>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Copia e Cola:</p>
                              <div className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-[10px] text-gray-400 font-mono break-all line-clamp-2" onClick={() => { navigator.clipboard.writeText(pixData.code); alert('Copiado!'); }}>
                                {pixData.code}
                              </div>
                            </div>
                            <div className="flex flex-col gap-3">
                              <button onClick={() => { navigator.clipboard.writeText(pixData.code); alert('Código Pix copiado!'); }} className="w-full bg-primary hover:bg-primary-hover py-5 rounded-2xl font-black italic tracking-tighter text-xl shadow-[0_15px_40px_rgba(229,9,20,0.3)] transition-all flex items-center justify-center gap-3">
                                <Copy size={20} /> COPIAR CÓDIGO PIX
                              </button>

                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    setLoading(true);
                                    try {
                                      const res = await axios.get(`https://api.pushinpay.com.br/api/pix/cashIn/${pixData.id}`, {
                                        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PUSHIN_TOKEN}` }
                                      }).catch(() => null);

                                      if (res?.data?.status === 'paid' || res?.data?.status === 'approved') {
                                        setIsPaid(true);
                                      } else {
                                        alert('Pagamento ainda não identificado. Se você já pagou, aguarde 30 segundos.');
                                      }
                                    } catch (e) {
                                      alert('Erro ao verificar pagamento.');
                                    }
                                    setLoading(false);
                                  }}
                                  className="flex-1 h-12 rounded-xl border border-white/10 hover:border-white/20 text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 text-gray-400"
                                >
                                  {loading ? <Loader2 size={14} className="animate-spin" /> : <p>Já paguei, verificar agora</p>}
                                </button>

                                {window.location.hostname === 'localhost' && (
                                  <button
                                    onClick={async () => {
                                      if (!confirm('Simular aprovação agora?')) return;
                                      setLoading(true);
                                      try {
                                        await axios.post('/api/test-pix', {
                                          transactionId: pixData.id,
                                          email: formData.email,
                                          status: 'paid'
                                        });
                                      } catch (e) { alert('Erro na simulação'); }
                                      setLoading(false);
                                    }}
                                    className="bg-yellow-600/10 border border-yellow-600/20 text-yellow-600 px-3 rounded-xl text-[8px] font-black uppercase hover:bg-yellow-600 hover:text-white transition-all"
                                  >
                                    Simular ok
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 space-y-3 border-t border-white/5 pt-6 text-left">
                            {surpriseContent.map((s, i) => (
                              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: surpriseStep > i ? 1 : 0.2, x: surpriseStep > i ? 0 : -10 }} className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-full ${surpriseStep > i ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-600'}`}>
                                  <s.icon size={14} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${surpriseStep > i ? 'text-white' : 'text-gray-500'}`}>{s.text}</span>
                                {surpriseStep > i && <CheckCircle2 size={12} className="text-green-500 ml-auto" />}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-12 flex flex-col items-center gap-6 border-t border-white/5 pt-8">
                      <div className="flex items-center gap-3">
                        <img src="https://i.imgur.com/LgBsB9x.png" alt="Pix" className="h-8 grayscale opacity-80" />
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-1.5 opacity-50">
                          <ShieldCheck size={14} className="text-white" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white">Pagamento 100% Seguro</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonials */}
              <div className="mt-20 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                  {testimonials.map((t, i) => (
                    <div key={i} className="bg-white p-4 rounded-[1.5rem] shadow-xl flex flex-col justify-between h-full border border-gray-100">
                      <div>
                        <div className="flex gap-0.5 mb-2">
                          {[...Array(5)].map((_, j) => <Star key={j} size={8} fill="#e50914" className="text-primary" />)}
                        </div>
                        <p className="text-[10px] text-gray-800 font-bold italic line-clamp-4 leading-relaxed mb-4">"{t.text}"</p>
                      </div>
                      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary">{t.name.charAt(0)}</div>
                        <div>
                          <p className="text-[8px] text-black font-black uppercase tracking-widest truncate">{t.name}</p>
                          <p className="text-[6px] text-primary font-bold uppercase tracking-widest">Verificado</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL: EXPLORAR PLANOS (Botões rápidos como na imagem 2) */}
      <AnimatePresence>
        {showAllPlans && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAllPlans(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative w-full max-w-md bg-[#0d0d0d] rounded-[2rem] border border-red-600/20 p-8 shadow-[0_0_100px_rgba(229,9,20,0.1)] flex flex-col gap-8">
              <button onClick={() => setShowAllPlans(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-all"><X size={20} /></button>

              <div className="text-center space-y-2">
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight">Selecione quantos meses<br />deseja ativar</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[2, 4, 5, 7, 8, 9, 12, 18, 24].map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      const pStr = getPlanPrice(m);
                      setSelectedPlan({ id: m, months: m, period: `${m} ${m === 1 ? 'Mês' : 'Meses'}`, price: pStr } as any);
                    }}
                    className={`h-14 rounded-xl border font-black text-[12px] md:text-sm uppercase tracking-widest transition-all ${selectedPlan.id === m
                      ? 'bg-red-600/10 border-red-600 text-red-600'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                  >
                    {m} Meses
                  </button>
                ))}
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle size={18} className="text-yellow-500 shrink-0" />
                <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest leading-relaxed">Plano personalizado sem desconto promocional.</p>
              </div>

              <button
                onClick={() => {
                  setStep('checkout');
                  setShowAllPlans(false);
                }}
                className="w-full bg-[#1a1f2e] hover:bg-[#252b3d] text-gray-400 hover:text-white py-5 rounded-2xl font-black uppercase text-sm italic tracking-tighter flex items-center justify-center gap-2 transition-all group"
              >
                <Zap size={18} className="group-hover:scale-110 transition-transform" />
                Continuar para pagamento
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MICRO FOOTER */}
      <footer className="py-12 border-t border-primary/10 opacity-20 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-gray-400 italic">RedFlix Renove © 2026 • Premium Experience</p>
      </footer>
    </div >
  );
}
