'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { auth, db } from '@/lib/firebase';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import {
    Users, Phone, Mail, Clock, Shield, Search, LogOut, CheckCircle2,
    AlertCircle, DollarSign, TrendingUp, BarChart3, Star, MessageCircle,
    MoreVertical, FileText, Trash2, Smartphone, Send, Calendar, Percent, QrCode, Copy, Loader2, Menu, X, Lock, ChevronDown
} from 'lucide-react';
import axios from 'axios';

interface Lead {
    id: string;
    email: string;
    phone: string;
    plan: string;
    price: string;
    status: string;
    origin?: string;
    createdAt: Timestamp | null;
}

const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    const cleanStr = priceStr.replace(/[^\d.,]/g, '');
    const dotStr = cleanStr.replace(',', '.');
    const val = parseFloat(dotStr);
    return isNaN(val) ? 0 : val;
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(val);
};

const getDaysRemaining = (createdAt: Timestamp | null, plan: string) => {
    if (!createdAt) return 999;
    const startDate = createdAt.toDate();
    let durationDays = 30;
    const p = plan?.toLowerCase() || '';
    if (p.includes('2 meses')) durationDays = 60;
    if (p.includes('4 meses')) durationDays = 120;
    if (p.includes('5 meses')) durationDays = 150;
    if (p.includes('7 meses')) durationDays = 210;
    if (p.includes('8 meses')) durationDays = 240;
    if (p.includes('9 meses')) durationDays = 270;
    if (p.includes('12 meses') || p.includes('1 ano')) durationDays = 365;
    if (p.includes('18 meses')) durationDays = 540;
    if (p.includes('24 meses') || p.includes('2 anos')) durationDays = 720;


    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    const diffTime = expiryDate.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function RenoveDashboard() {
    // --- Security Config ---
    const ALLOWED_IP = process.env.NEXT_PUBLIC_ALLOWED_IP;
    const SECRET_PASSWORD = 'renove123'; // Senha específica da Renove
    const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [authChecking, setAuthChecking] = useState(true);

    // Filtros fixos para Renove
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'expiring'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'month' | 'all'>('all');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // 2. Monitoramento de Sessão
    useEffect(() => {
        const stored = localStorage.getItem('renove_admin_session');
        if (stored) {
            try {
                const { timestamp, authenticated } = JSON.parse(stored);
                if (authenticated && (Date.now() - timestamp < SESSION_DURATION)) {
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('renove_admin_session');
                }
            } catch (e) { localStorage.removeItem('renove_admin_session'); }
        }
        setAuthChecking(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === SECRET_PASSWORD) {
            setIsAuthenticated(true);
            localStorage.setItem('renove_admin_session', JSON.stringify({
                authenticated: true,
                timestamp: Date.now()
            }));
        } else {
            alert('Senha Incorreta!');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('renove_admin_session');
        setIsAuthenticated(false);
        window.location.reload();
    };

    // LOAD LEADS (FILTRADO APENAS RENOVE)
    useEffect(() => {
        if (!isAuthenticated) return;
        setLoading(true);
        // Query only RENOVE leads
        const q = query(collection(db, "leads"), where("origin", "==", "renove"), orderBy("createdAt", "desc"));
        // Note: Composite index might be needed: origin Asc, createdAt Desc
        // Fallback to client filtering if index missing initially
        const unsubscribe = onSnapshot(collection(db, "leads"), (snapshot) => {
            const allLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
            const renoveLeads = allLeads.filter(l => l.origin === 'renove' || l.origin === 'Renove');
            // Sort client side just in case
            renoveLeads.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setLeads(renoveLeads);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [isAuthenticated]);

    const metrics = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(new Date(now).setHours(0, 0, 0, 0));
        const startOfWeek = new Date(new Date(now).setDate(now.getDate() - 7));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const filtered = leads.filter(l => {
            if (!l.createdAt) return false;
            const d = l.createdAt.toDate();
            let passDate = true;

            if (dateFilter === 'today') passDate = d >= startOfDay;
            else if (dateFilter === 'yesterday') {
                const startOfYesterday = new Date(startOfDay);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                passDate = d >= startOfYesterday && d < startOfDay;
            } else if (dateFilter === 'month') passDate = d >= startOfMonth;

            const passSearch = l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.phone.includes(searchTerm);

            return passDate && passSearch;
        });

        const approvedFiltered = filtered.filter(l => l.status === 'renewed' || l.status === 'approved');
        const revFiltered = approvedFiltered.reduce((acc, curr) => acc + parsePrice(curr.price), 0);

        return {
            data: filtered,
            revenueFiltered: revFiltered,
            salesFiltered: approvedFiltered.length,
            leadsFiltered: filtered.length,
            conversion: filtered.length > 0 ? (approvedFiltered.length / filtered.length) * 100 : 0,
        };
    }, [leads, searchTerm, dateFilter]);

    if (authChecking) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6 bg-gradient-to-br from-blue-900/20 to-black">
                <div className="w-full max-w-md bg-[#0a0a0a] p-10 rounded-3xl border border-white/5">
                    <h1 className="text-3xl font-black italic text-white text-center mb-8 uppercase tracking-tighter">
                        <span className="text-blue-500">RENOVE</span> ADMIN
                    </h1>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <input
                            type="password"
                            placeholder="SENHA MESTRA"
                            className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-center tracking-widest outline-none focus:border-blue-500 transition-colors"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all">
                            ACESSAR PAINEL
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#020202] text-white font-sans flex overflow-hidden">
            {/* Sidebar */}
            <aside className={`fixed md:relative inset-y-0 left-0 z-50 bg-[#050505] border-r border-white/5 w-72 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 flex items-center justify-between">
                    <span className="font-black italic text-2xl tracking-tighter text-blue-500">RENOVE</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X /></button>
                </div>
                <nav className="p-4 space-y-2">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 p-4 rounded-xl font-bold uppercase text-xs tracking-widest ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                        <TrendingUp size={18} /> DASHBOARD
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-xl font-bold uppercase text-xs tracking-widest text-gray-500 hover:text-red-500 mt-auto">
                        <LogOut size={18} /> SAIR
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-10 relative">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute top-4 left-4 p-2 bg-white/5 rounded"><Menu /></button>

                <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-10 text-center md:text-left">
                    Visão Geral <span className="text-blue-500">Renove</span>
                </h2>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Faturamento</p>
                        <p className="text-3xl font-black text-white mt-2">{formatCurrency(metrics.revenueFiltered)}</p>
                    </div>
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Renovações</p>
                        <p className="text-3xl font-black text-blue-500 mt-2">{metrics.salesFiltered}</p>
                    </div>
                    <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Conversão</p>
                        <p className="text-3xl font-black text-green-500 mt-2">{metrics.conversion.toFixed(1)}%</p>
                    </div>
                </div>

                {/* Tabela Simplificada */}
                <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex gap-4">
                        <input
                            type="text"
                            placeholder="BUSCAR CLIENTE..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-black border border-white/10 rounded-xl px-4 py-2 w-full text-xs font-bold text-white focus:border-blue-500 outline-none uppercase"
                        />
                        <select
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value as any)}
                            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-gray-400 outline-none uppercase"
                        >
                            <option value="all">Tudo</option>
                            <option value="today">Hoje</option>
                            <option value="month">Mês</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#050505] text-[9px] font-black uppercase tracking-widest text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Plano</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs font-bold text-gray-300">
                                {metrics.data.slice(0, 50).map(lead => (
                                    <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-white">{lead.email}</div>
                                            <div className="text-[10px] text-gray-600 font-mono mt-1">{lead.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-blue-400 uppercase">{lead.plan}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[9px] uppercase tracking-wider ${lead.status === 'renewed' || lead.status === 'approved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                }`}>
                                                {lead.status === 'renewed' ? 'Renovado' : lead.status === 'approved' ? 'Aprovado' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-500">
                                            {lead.createdAt?.toDate().toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
