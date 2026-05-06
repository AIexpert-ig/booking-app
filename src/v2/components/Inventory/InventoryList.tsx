import React, { useEffect, useState } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { Dress } from '../../types';
import AvailabilityChecker from './AvailabilityChecker';
import DressForm from './DressForm';
import { Search, Plus, Loader2, Package, ArrowRight, Edit3 } from 'lucide-react';

interface Props {
    isAdmin: boolean;
}

export default function InventoryList({ isAdmin }: Props) {
    const [dresses, setDresses] = useState<Dress[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingDress, setEditingDress] = useState<Dress | null>(null);
    const [checkerDress, setCheckerDress] = useState<Dress | null>(null);

    const reload = async () => {
        setLoading(true);
        const data = await inventoryService.fetchDresses();
        setDresses(data);
        setLoading(false);
    };

    useEffect(() => { reload(); }, []);

    const filtered = dresses.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.category && d.category.toLowerCase().includes(search.toLowerCase()))
    );

    if (showForm || editingDress) {
        return (
            <DressForm 
                initialData={editingDress || undefined} 
                onSuccess={() => { setShowForm(false); setEditingDress(null); reload(); }} 
                onCancel={() => { setShowForm(false); setEditingDress(null); }} 
            />
        );
    }

    if (checkerDress) {
        return (
            <div className="max-w-xl mx-auto space-y-8 animate-in" dir="rtl">
                <button onClick={() => setCheckerDress(null)}
                    className="text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> العودة للمجموعة
                </button>
                <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-32 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0 border border-stone-100">
                            {checkerDress.image_url ? (
                                <img src={checkerDress.image_url} alt={checkerDress.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 bg-stone-900 text-white">
                                    <span className="text-[8px] font-bold uppercase tracking-widest leading-tight">Atelie</span>
                                    <span className="text-[10px] font-bold leading-tight">Faryal</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{checkerDress.category}</span>
                            <h2 className="text-3xl font-bold text-stone-900">{checkerDress.name}</h2>
                            <p className="text-xl font-bold text-stone-700">{checkerDress.basePrice} ج.م <span className="text-sm text-stone-400 font-normal">/ يوم</span></p>
                        </div>
                    </div>
                    <AvailabilityChecker dress={checkerDress} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in" dir="rtl">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-stone-200 pb-8">
                <div>
                    <h2 className="text-4xl font-bold text-stone-900">المجموعة</h2>
                    <p className="text-stone-500 text-lg mt-1">فساتين سهرة حصرية وتصاميم عالمية.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                        <input type="text" placeholder="بحث في التصاميم..." value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pr-12 pl-4 py-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-900 w-full md:w-64 shadow-sm transition-all" />
                    </div>
                    {isAdmin && (
                        <button onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-all shadow-md">
                            <Plus className="w-4 h-4" /> تصميم جديد
                        </button>
                    )}
                </div>
            </header>

            {loading ? (
                <div className="py-32 flex flex-col items-center gap-4 text-stone-300">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="font-medium">جاري تحميل المجموعة...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-24 text-center space-y-4 bg-white rounded-2xl border border-dashed border-stone-300">
                    <Package className="w-12 h-12 text-stone-200 mx-auto" />
                    <p className="text-stone-400 text-lg">لم يتم العثور على أي تصاميم تطابق بحثك.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map(dress => (
                        <div key={dress.id}
                            className="group bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-stone-400 transition-all shadow-sm hover:shadow-md flex flex-col relative">
                            <div className="h-80 relative overflow-hidden bg-stone-50">
                                {dress.image_url ? (
                                    <img
                                        src={dress.image_url}
                                        alt={dress.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-white p-8">
                                        <h4 className="text-xl font-bold uppercase tracking-[0.2em] mb-1">Atelie</h4>
                                        <h4 className="text-2xl font-serif tracking-widest">Faryal Al Hosary</h4>
                                        <div className="w-12 h-[1px] bg-white/30 mt-6" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingDress(dress); }}
                                            className="p-2 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-white shadow-sm transition-all"
                                            title="تعديل التصميم"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                        {dress.category}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 flex flex-col flex-1 space-y-4 text-right">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-stone-900">{dress.name}</h3>
                                    <div className="text-left flex-shrink-0 mr-4">
                                        <p className="text-lg font-bold text-stone-900">{dress.basePrice} ج.م</p>
                                        <p className="text-[10px] text-stone-400 font-bold">/ يوم</p>
                                    </div>
                                </div>
                                {dress.description && (
                                    <p className="text-stone-500 text-sm line-clamp-2">{dress.description}</p>
                                )}
                                <div className="mt-auto pt-4">
                                    <button onClick={() => setCheckerDress(dress)}
                                        className="w-full h-11 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all">
                                        التحقق والحجز
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
