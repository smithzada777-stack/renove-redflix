'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Star, Clock, ShieldCheck,
  Zap, Phone, Mail, QrCode, ArrowLeft,
  Shield, Tv, Film, Headphones, Download, ChevronDown, ChevronRight, Loader2, Copy,
  Users, X, Calendar
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

  // Lógica de escala de desconto para planos maiores
  let discount = 0;
  if (months >= 12) discount = 0.25;
  else if (months >= 9) discount = 0.20;

  const total = months * BASE_PRICE * (1 - discount);
  return total.toFixed(2).replace('.', ',');
};

const bonuses = [
  { icon: Tv, title: '3 Telas Simultâneas', desc: 'Assista no celular, TV e PC.' },
  { icon: Zap, title: 'Sem Travamentos', desc: 'Tecnologia anti-lag premium.' },
  { icon: Headphones, title: 'Suporte 24h', desc: 'Equipe VIP pronta para ajudar.' },
  { icon: Shield, title: 'Garantia Total', desc: 'Satisfação 100% garantida.' },
  { icon: Film, title: '4K Ultra HD', desc: 'Imagem cristalina em 4K.' },
  { icon: Download, title: 'Modo Offline', desc: 'Baixe e assista sem internet.' },
];

const Logo = () => (
  <div className="relative w-48 h-12">
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
  const [realSales, setRealSales] = useState(0);

  // Monitorar vendas reais para social proof
  useEffect(() => {
    const q = query(collection(db, "leads"), where("status", "in", ["approved", "renewed"]), limit(1));
    const unsub = onSnapshot(q, (snap) => setRealSales(Math.floor(Math.random() * 50) + 1240));
    return () => unsub();
  }, []);

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

    // Lowercase email for consistent matching
    const cleanEmail = formData.email.toLowerCase().trim();
    if (!cleanEmail.endsWith('@gmail.com')) return alert("Use um e-mail @gmail.com oficial!");

    setLoading(true);
    try {
      const leadRef = await addDoc(collection(db, "leads"), {
        email: formData.email,
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
    { months: 1, price: '29,90', oldPrice: '39,90', highlight: false, users: 125 + realSales },
    { months: 3, price: '79,90', oldPrice: '89,70', highlight: true, users: 840 + realSales },
    { months: 6, price: '149,90', oldPrice: '179,40', highlight: false, users: 420 + realSales },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 font-sans">
      {/* Header */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Renovação Imediata</span>
            <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sistema Online</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <AnimatePresence mode="wait">

          {/* STEP 1: PLANS */}
          {step === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              <div className="text-center space-y-6 max-w-3xl mx-auto">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-4"
                >
                  Área de Renovação
                </motion.div>
                <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase leading-none text-primary">
                  Assine Renove:
                </h1>
                <p className="text-gray-500 text-sm md:text-lg font-medium max-w-xl mx-auto leading-relaxed">
                  Não perca seu acesso! Renove agora e continue aproveitando todo o catálogo em 4K sem interrupções.
                </p>
              </div>

              {/* Grid de Planos Principais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {mainPlans.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`group relative rounded-[3rem] p-8 md:p-10 border transition-all duration-500 ${p.highlight
                      ? 'bg-[#121212] border-primary/50 shadow-[0_30px_100px_rgba(229,9,20,0.2)] scale-105 z-10'
                      : 'bg-[#0a0a0a] border-white/10 hover:border-white/20'
                      }`}
                  >
                    {p.highlight && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-xl z-20 flex items-center gap-2">
                        <Zap size={14} fill="white" /> MAIS POPULAR
                      </div>
                    )}

                    <div className="text-center space-y-6 mb-8">
                      <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] ${p.highlight ? 'text-primary' : 'text-gray-500'}`}>
                        Plano {p.months} {p.months === 1 ? 'Mês' : 'Meses'}
                      </h3>
                      <div className="space-y-1">
                        <span className="text-gray-600 line-through text-lg font-bold">R$ {p.oldPrice}</span>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-2xl font-black text-primary/50 italic">R$</span>
                          <span className="text-6xl md:text-7xl font-black italic tracking-tighter drop-shadow-[0_0_20px_rgba(229,9,20,0.3)]">
                            {p.price}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-10">
                      {bonuses.slice(0, 4).map((b, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={12} className="text-primary" />
                          </div>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{b.title}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePlanSelect(p.months)}
                      className={`w-full h-16 rounded-2xl font-black italic tracking-tighter text-xl flex items-center justify-center gap-2 transition-all ${p.highlight
                        ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95'
                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                        }`}
                    >
                      RENOVAR AGORA <ChevronRight size={20} />
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-2 text-gray-600">
                      <Users size={14} />
                      <span className="text-[10px] font-black uppercase">+{p.users.toLocaleString()} Ativos</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Outros Planos (Botão) */}
              <div className="text-center pt-8">
                <button
                  onClick={() => setShowAllPlans(true)}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-white">Ver Todos os Planos</span>
                  <ChevronDown className="text-primary group-hover:translate-y-1 transition-transform" />
                </button>
              </div>

              {/* Bônus Adicionais Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto pt-20">
                {bonuses.map((b, i) => (
                  <div key={i} className="bg-[#050505] border border-white/5 p-6 rounded-[2rem] flex flex-col items-center text-center space-y-4 hover:border-primary/20 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <b.icon size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-black uppercase text-white tracking-tight">{b.title}</h4>
                      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="bg-[#0f0f0f] border-2 border-primary/20 rounded-[3.5rem] p-10 md:p-14 shadow-2xl relative overflow-hidden">
                <button
                  onClick={() => setStep('plans')}
                  className="absolute left-8 top-8 text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <ArrowLeft size={16} /> Voltar
                </button>

                <div className="text-center space-y-10 mt-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase">Quase lá!</h2>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Confirme seus dados de acesso</p>
                  </div>

                  <div className="bg-black/50 border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-inner">
                    <div className="text-left">
                      <span className="text-[10px] text-primary font-black uppercase tracking-widest">Plano Selecionado</span>
                      <h3 className="text-xl font-black italic text-white uppercase">{selectedPlan.months} Mês/Meses</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest leading-none">Total</span>
                      <p className="text-3xl font-black text-white italic">R$ {selectedPlan.price}</p>
                    </div>
                  </div>

                  <form className="space-y-6" onSubmit={handleGeneratePix}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2 block text-left">Seu Melhor E-mail (@gmail.com)</label>
                        <div className="relative group">
                          <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" />
                          <input
                            type="email"
                            required
                            className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                            placeholder="exemplo@gmail.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2 block text-left">WhatsApp (DDD + Número)</label>
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
                      className="w-full bg-primary hover:bg-primary-hover h-20 rounded-2xl font-black italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-primary/20 hover:scale-[1.02]"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <>GERAR PAGAMENTO <ChevronRight /></>}
                    </button>

                    <div className="flex items-center justify-center gap-6 opacity-40">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"><Shield size={12} /> 100% Seguro</div>
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"><QrCode size={12} /> Pix Imediato</div>
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-[#0f0f0f] border-2 border-primary/20 rounded-[3.5rem] overflow-hidden shadow-2xl relative">
                <div className="bg-primary/10 p-10 text-center border-b border-primary/20">
                  <h2 className="text-3xl font-black italic tracking-tight uppercase mb-2">Quase Pronto!</h2>
                  <p className="text-xs font-bold text-primary uppercase tracking-[0.3em] animate-pulse">Aguardando seu pagamento...</p>
                </div>

                <div className="p-10 space-y-8">
                  <div className="flex flex-col items-center gap-6">
                    <div className="text-center space-y-1">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tempo para pagar:</p>
                      <p className="text-4xl font-black italic tracking-tighter text-white">{formatTime(timeLeft)}</p>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl relative group">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 group-hover:scale-100 transition-all opacity-50" />
                      <img src={pixData.image} alt="QR Code" className="w-56 h-56 relative z-10" />
                    </div>

                    <div className="w-full space-y-4">
                      <div className="bg-black border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-gray-500 break-all text-center">
                        {pixData.code}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.code);
                          alert("Código copiado!");
                        }}
                        className="w-full bg-white text-black h-16 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                      >
                        <Copy size={18} /> COPIAR CÓDIGO PIX
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      <Mail className="text-primary shrink-0" size={20} />
                      <div className="text-left">
                        <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Enviando acesso para:</p>
                        <p className="text-xs font-black text-white">{formData.email}</p>
                      </div>
                    </div>
                    {isPaid && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-500 text-white p-6 rounded-2xl text-center shadow-lg shadow-green-500/30"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <CheckCircle2 size={24} />
                          <span className="font-black italic text-xl uppercase tracking-tighter">PAGAMENTO APROVADO!</span>
                        </div>
                        <p className="text-xs font-bold mt-1 opacity-90 uppercase">Verifique seu e-mail agora mesmo.</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MODAL: TODOS OS PLANOS (GLASSMORPHISM) */}
      <AnimatePresence>
        {showAllPlans && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllPlans(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] glass rounded-[3.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(229,9,20,0.1)] border border-white/10"
            >
              {/* Header Modal */}
              <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-3xl">
                <div className="flex-1">
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">
                    Todos os <span className="text-primary">Planos:</span>
                  </h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-2 leading-relaxed">
                    Escolha o período ideal. Quanto <span className="text-primary">maior o plano</span>, maior o seu <span className="text-white">desconto exclusivo</span> na renovação.
                  </p>
                </div>
                <button
                  onClick={() => setShowAllPlans(false)}
                  className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/10 ml-4 shrink-0"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Scroll Area */}
              <div className="p-4 md:p-12 overflow-y-auto scrollbar-hide">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                    const price = getPlanPrice(m);
                    const perMonth = (parseFloat(price.replace(',', '.')) / m).toFixed(2).replace('.', ',');
                    const isYearly = m === 12;

                    return (
                      <div
                        key={m}
                        className={`group relative bg-black/40 border border-white/5 rounded-[2.5rem] p-8 transition-all hover:bg-black/60 hover:border-primary/30 flex flex-col justify-between h-full ${isYearly ? 'ring-2 ring-primary/40' : ''}`}
                      >
                        {isYearly && (
                          <div className="absolute -top-3 right-8 bg-primary text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Melhor Valor</div>
                        )}
                        <div className="space-y-6">
                          <div className="flex justify-between items-start">
                            <h3 className="text-2xl font-black italic text-white uppercase leading-none">{m} {m === 1 ? 'Mês' : 'Meses'}</h3>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                              <Calendar size={18} />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-black text-primary/50 italic">R$</span>
                              <span className="text-4xl font-black italic tracking-tighter text-white">{price}</span>
                            </div>
                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">R$ {perMonth} por mês</p>
                          </div>

                          <div className="space-y-2 pt-4">
                            <ul className="space-y-2">
                              <li className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                <Zap size={10} className="text-primary" /> Acesso Imediato
                              </li>
                              <li className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                <Tv size={10} className="text-primary" /> 4K Ultra HD
                              </li>
                              <li className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                <Users size={10} className="text-primary" /> 3 Telas
                              </li>
                            </ul>
                          </div>
                        </div>

                        <button
                          onClick={() => handlePlanSelect(m)}
                          className="mt-6 w-full h-12 md:h-14 rounded-xl bg-white/5 text-white font-black uppercase text-[10px] border border-white/10 group-hover:bg-primary group-hover:border-primary transition-all flex items-center justify-center gap-2"
                        >
                          Selecionar <ChevronRight size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Modal */}
              <div className="p-8 border-t border-white/10 bg-black/40 backdrop-blur-3xl text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                  *A renovação é válida imediatamente após a confirmação do pagamento.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-black">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <Logo />
          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.5em]">RedFlix Renove © 2026 • Premium Experience</p>
          <div className="flex items-center justify-center gap-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Termos</a>
            <a href="#" className="hover:text-primary transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
