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
    { months: 1, price: '29,90', oldPrice: '39,90', highlight: false, users: 500, desc: 'Plano normal (sem desconto)' },
    { months: 3, price: '79,90', oldPrice: '89,70', highlight: true, users: 2000, desc: 'Economize 11%', bonus: ['3 Telas Simultâneas', 'Suporte VIP 24h', 'Sem Travamentos'] },
    { months: 6, price: '149,90', oldPrice: '179,40', highlight: false, users: 250, desc: 'Economize 16%' },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600/30 font-sans">
      {/* Header */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-600/10 text-red-600 px-4 py-2 rounded-full border border-red-600/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Atendimento Ativo</span>
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
              <div className="text-center space-y-6 max-w-3xl mx-auto px-4">
                <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9] text-white">
                  <span className="text-red-600">RENOVE</span> ou <span className="text-red-600">ATIVE</span> <br /> seu plano:
                </h1>
                <p className="text-gray-500 text-xs md:text-sm font-bold uppercase tracking-[0.2em] max-w-xl mx-auto leading-relaxed">
                  Escolha o período ideal e garanta seu acesso imediato
                </p>
              </div>

              {/* Grid de Planos Principais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto perspective-1000">
                {mainPlans.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`group relative rounded-[2.5rem] p-8 md:p-10 transition-all duration-500 flex flex-col justify-between overflow-hidden ${p.highlight
                      ? 'bg-[#0a0a0a] border-2 border-red-600 shadow-[0_0_80px_rgba(229,9,20,0.15)] scale-105 z-10'
                      : 'bg-[#0a0a0a] border border-white/5 hover:border-white/20'
                      }`}
                  >
                    {p.highlight && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-8 py-2.5 rounded-b-2xl uppercase tracking-widest shadow-xl z-20 flex items-center gap-2">
                        <Zap size={14} fill="white" /> MAIS VENDIDO
                      </div>
                    )}

                    <div className="text-center space-y-6 relative z-10">
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                        {p.months} {p.months === 1 ? 'Mês' : 'Meses'}
                      </h3>

                      <div className="space-y-1">
                        <span className="text-gray-600 line-through text-sm font-bold">R$ {p.oldPrice}</span>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-4xl md:text-6xl font-black italic tracking-tighter text-white group-hover:text-red-600 transition-colors">
                            <span className={p.highlight ? 'text-red-600' : ''}>R$ {p.price}</span>
                          </span>
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${p.desc.includes('Economize') ? 'text-green-500' : 'text-gray-500'}`}>
                          {p.desc.includes('Economize') ? `✓ ${p.desc}` : p.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-2 py-4">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(u => (
                            <div key={u} className="w-5 h-5 rounded-full bg-gray-800 border-2 border-black flex items-center justify-center">
                              <Users size={8} className="text-red-600" />
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{p.users.toLocaleString()} pessoas assinaram este plano</span>
                      </div>

                      {p.bonus && (
                        <div className="space-y-3 py-4 border-t border-white/5">
                          {p.bonus.map((b, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                              <CheckCircle2 size={12} className="text-red-600" /> {b}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handlePlanSelect(p.months)}
                      className={`w-full h-16 mt-8 rounded-2xl font-black italic tracking-tighter text-xl flex items-center justify-center gap-2 transition-all relative z-10 ${p.highlight
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:scale-[1.05]'
                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                        }`}
                    >
                      {p.highlight && <Zap size={20} fill="white" />} Selecionar Plano
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Outros Planos (Botão) */}
              <div className="text-center pt-8">
                <button
                  onClick={() => setShowAllPlans(true)}
                  className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-white/5 border border-white/10 hover:border-red-600/50 transition-all group shadow-2xl"
                >
                  <Calendar className="text-red-600 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-white">Explorar Outros Períodos</span>
                  <ChevronRight size={18} className="text-red-600 group-hover:translate-x-1 transition-transform" />
                </button>
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
              <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 md:p-14 shadow-2xl relative overflow-hidden">
                <button
                  onClick={() => setStep('plans')}
                  className="absolute left-8 top-8 group text-gray-500 hover:text-red-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar
                </button>

                <div className="text-center space-y-10 mt-6">
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Checkout <span className="text-red-600">Seguro</span></h2>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Seu acesso será enviado via e-mail</p>
                  </div>

                  <div className="bg-black border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-inner">
                    <div className="text-left">
                      <span className="text-[9px] text-red-600 font-black uppercase tracking-widest">Plano Selecionado</span>
                      <h3 className="text-xl font-black italic text-white uppercase">{selectedPlan.months} Mês/Meses</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest leading-none">Total</span>
                      <p className="text-3xl font-black text-white italic">R$ {selectedPlan.price}</p>
                    </div>
                  </div>

                  <form className="space-y-8" onSubmit={handleGeneratePix}>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4 block text-left">E-mail para Receber Acesso (@gmail.com)</label>
                        <div className="relative group">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-14 flex justify-center">
                            <Mail size={18} className="text-gray-600 group-focus-within:text-red-600 transition-colors" />
                          </div>
                          <input
                            type="email"
                            required
                            className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm focus:outline-none focus:border-red-600 transition-all shadow-inner text-white font-bold"
                            placeholder="exemplo@gmail.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4 block text-left">WhatsApp de Suporte</label>
                        <div className="relative group">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-14 flex justify-center">
                            <Phone size={18} className="text-gray-600 group-focus-within:text-red-600 transition-colors" />
                          </div>
                          <input
                            type="tel"
                            required
                            className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm focus:outline-none focus:border-red-600 transition-all shadow-inner text-white font-bold"
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
                      className="w-full bg-red-600 hover:bg-red-700 h-20 rounded-2xl font-black italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-95"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <>GERAR CÓDIGO PIX <ChevronRight /></>}
                    </button>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <img src="https://i.imgur.com/vHq83T4.png" alt="Pix" className="w-12 h-12 rounded-xl object-contain bg-white p-2" />
                        <div className="text-left">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">Pagamento Seguro</p>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight leading-tight">Sua transação é criptografada e verificada</p>
                        </div>
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto"
            >
              {isPaid ? (
                <div className="bg-[#0a0a0a] border-2 border-green-500/50 rounded-[3.5rem] p-10 md:p-14 text-center space-y-8 shadow-[0_0_100px_rgba(34,197,94,0.1)]">
                  <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/20">
                    <CheckCircle2 size={48} className="text-green-500" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-white leading-none">PAGAMENTO <br /><span className="text-green-500 text-6xl">APROVADO!</span></h2>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Seu acesso foi liberado com prioridade máxima</p>
                  </div>

                  <div className="bg-black/50 border border-white/5 rounded-3xl p-8 space-y-6 text-left shadow-inner">
                    <p className="text-red-500 font-black uppercase text-xs tracking-widest border-b border-red-500/10 pb-4">Instruções para Resgate:</p>
                    <ul className="space-y-4">
                      {[
                        'Verifique sua caixa de entrada e SPAM agora mesmo.',
                        'Caso o e-mail atrase, clique no botão para falar no WhatsApp.',
                        'Tenha seu e-mail em mãos para agilizar o suporte.'
                      ].map((text, idx) => (
                        <li key={idx} className="flex gap-4">
                          <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-600 flex items-center justify-center shrink-0 font-black text-xs">{idx + 1}</span>
                          <span className="text-xs font-bold text-gray-300 uppercase tracking-tight leading-relaxed">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href="https://wa.me/5571991644164"
                    target="_blank"
                    className="w-full bg-green-600 hover:bg-green-700 h-20 rounded-2xl font-black italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-600/20"
                  >
                    FALAR NO WHATSAPP <ChevronRight />
                  </a>
                </div>
              ) : (
                <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
                  <div className="bg-red-600/5 p-10 text-center border-b border-white/10">
                    <h2 className="text-3xl font-black italic tracking-tight uppercase mb-2">Quase Pronto!</h2>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] animate-pulse">Aguardando Confirmação Bancária...</p>
                  </div>

                  <div className="p-10 space-y-10">
                    <div className="flex flex-col items-center gap-8">
                      <div className="text-center space-y-1">
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Expira em:</p>
                        <p className="text-4xl font-black italic tracking-tighter text-white">{formatTime(timeLeft)}</p>
                      </div>

                      <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_0_50px_rgba(255,255,255,0.05)] relative group">
                        <div className="absolute inset-0 bg-red-600/10 blur-3xl rounded-full scale-75 group-hover:scale-100 transition-all opacity-50" />
                        <img src={pixData.image} alt="QR Code" className="w-56 h-56 relative z-10" />
                      </div>

                      <div className="w-full space-y-4">
                        <div className="bg-black border border-white/10 rounded-2xl p-6 text-[11px] font-mono text-gray-500 break-all text-center select-all cursor-pointer hover:border-red-600/50 transition-colors" onClick={() => { navigator.clipboard.writeText(pixData.code); alert("Código copiado!"); }}>
                          {pixData.code}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pixData.code);
                            alert("Código copiado!");
                          }}
                          className="w-full bg-red-600 text-white h-18 py-5 rounded-2xl font-black italic tracking-tighter text-xl flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-xl shadow-red-600/20"
                        >
                          <Copy size={20} /> COPIAR CÓDIGO PIX
                        </button>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 space-y-6">
                      <div className="flex items-center gap-4 bg-white/[0.02] p-6 rounded-2xl border border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center text-red-600">
                          <Mail size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Verifique seu e-mail após pagar:</p>
                          <p className="text-xs font-black text-white italic">{formData.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-4 opacity-40">
                        <Shield size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Ambiente 100% Blindado</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MODAL: TODOS OS PLANOS (RED THEME) */}
      <AnimatePresence>
        {showAllPlans && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllPlans(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-5xl max-h-[85vh] bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_120px_rgba(229,9,20,0.1)] border border-white/10"
            >
              {/* Header Modal */}
              <div className="p-8 md:p-10 border-b border-white/5 flex justify-between items-center bg-black/40">
                <div className="flex-1 text-left">
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">
                    Mais <span className="text-red-600">Opções</span> de Período
                  </h2>
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.4em] mt-3">Quanto maior o plano, menor o valor mensal</p>
                </div>
                <button
                  onClick={() => setShowAllPlans(false)}
                  className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-600 transition-all border border-white/5 ml-4 shrink-0"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Scroll Area */}
              <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {[1, 2, 3, 4, 5, 6, 9, 12].map((m) => {
                    const price = getPlanPrice(m);
                    const perMonth = (parseFloat(price.replace(',', '.')) / m).toFixed(2).replace('.', ',');
                    const isSelected = selectedPlan.months === m;

                    return (
                      <div
                        key={m}
                        className={`group relative bg-black border border-white/5 rounded-[2rem] p-6 transition-all hover:border-red-600/50 flex flex-col justify-between h-full ${isSelected ? 'border-red-600 ring-1 ring-red-600/20' : ''}`}
                      >
                        <div className="space-y-6 text-left">
                          <div className="flex justify-between items-start">
                            <h3 className="text-xl font-black italic text-white uppercase leading-none">{m} {m === 1 ? 'Mês' : 'Meses'}</h3>
                            <Calendar size={16} className="text-red-600" />
                          </div>

                          <div className="space-y-1">
                            <p className="text-3xl font-black italic tracking-tighter text-white group-hover:text-red-600 transition-colors">R$ {price}</p>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">R$ {perMonth} mensal</p>
                          </div>

                          <div className="pt-2">
                            <div className="h-px bg-white/5 w-full" />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-tight">
                              <CheckCircle2 size={10} className="text-red-600" /> Ativação em Segundos
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-tight">
                              <CheckCircle2 size={10} className="text-red-600" /> Suporte Premium
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handlePlanSelect(m)}
                          className={`mt-6 w-full h-12 rounded-xl text-white font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${isSelected ? 'bg-red-600' : 'bg-white/5 border border-white/10 group-hover:bg-red-600/10'}`}
                        >
                          {isSelected ? 'Sua Escolha' : 'Selecionar'} <ChevronRight size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Modal */}
              <div className="p-8 border-t border-white/5 bg-black/80 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-700 italic">Preço final com taxas inclusas</p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-600">
                  <ShieldCheck size={14} /> Pagamento 100% Criptografado
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-red-600/20 py-16 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
          <Logo />
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-[11px] font-black text-gray-600 uppercase tracking-widest">
            <a href="#" className="hover:text-red-600 transition-colors border-b border-transparent hover:border-red-600 pb-1">Privacidade</a>
            <a href="#" className="hover:text-red-600 transition-colors border-b border-transparent hover:border-red-600 pb-1">Termos de Uso</a>
            <a href="#" className="hover:text-red-600 transition-colors border-b border-transparent hover:border-red-600 pb-1">Suporte VIP</a>
          </div>
          <p className="text-[9px] text-gray-800 font-bold uppercase tracking-[0.6em]">RedFlix Renove © 2026 • Premium Experience</p>
        </div>
      </footer>
    </div>
  );
}
