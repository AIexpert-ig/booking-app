import React, { useState } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { Dress, InventoryItem } from '../../types';
import { Save, Plus, Trash2, Image as ImageIcon, Loader2, X } from 'lucide-react';

interface DressFormProps {
    initialData?: Dress;
    onSuccess: () => void;
    onCancel: () => void;
}

interface PhysicalItemDraft {
    size: string;
    color: string;
    sku: string;
}

export default function DressForm({ initialData, onSuccess, onCancel }: DressFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState<Omit<Dress, 'id' | 'createdAt'>>(initialData || {
        name: '',
        description: '',
        basePrice: 0,
        category: 'فساتين سهرة',
        imageUrl: '',
        cleaningBufferDays: 1,
    });
    const [items, setItems] = useState<PhysicalItemDraft[]>([{ size: 'M', color: '', sku: '' }]);

    const addItemRow = () => setItems(prev => [...prev, { size: 'M', color: '', sku: '' }]);
    const removeItemRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: keyof PhysicalItemDraft, value: string) =>
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (initialData) {
                await inventoryService.updateDress(initialData.id, formData);
            } else {
                const dressId = await inventoryService.addDress(formData);
                await Promise.all(
                    items
                        .filter(item => item.size.trim() !== '')
                        .map(item =>
                            inventoryService.addInventoryItem({
                                dressId,
                                size: item.size,
                                color: item.color || undefined,
                                sku: item.sku || undefined,
                                status: 'available',
                            } as Omit<InventoryItem, 'id'>)
                        )
                );
            }
            onSuccess();
        } catch (err) {
            setError('فشل الحفظ. يرجى التحقق من البيانات والمحاولة مرة أخرى.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto animate-in">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden text-right" dir="rtl">
                <header className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-900">
                            {initialData ? 'تحديث التصميم' : 'تسجيل تصميم جديد'}
                        </h2>
                        <p className="text-stone-500 text-sm mt-1">إضافة قطعة جديدة وتفاصيل مخزونها الفعلي.</p>
                    </div>
                    <button type="button" onClick={onCancel} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-8 space-y-8">
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-medium">{error}</div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest">اسم الفستان *</label>
                            <input
                                type="text" required value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full h-12 px-5 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-900 transition-all text-lg font-medium"
                                placeholder="مثال: فستان سهرة حريري أسود"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest">الفئة *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full h-12 px-5 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-900 transition-all appearance-none cursor-pointer"
                            >
                                <option>فساتين سهرة</option>
                                <option>كوكتيل</option>
                                <option>زفاف</option>
                                <option>إكسسوارات</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest">السعر اليومي (ج.م) *</label>
                            <input
                                type="number" required min={0} value={formData.basePrice}
                                onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                                className="w-full h-12 px-5 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-900 transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest">صورة التصميم</label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-24 h-24 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center group">
                                    {formData.imageUrl ? (
                                        <>
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </>
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-stone-300" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="inline-block px-6 py-3 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <Plus className="w-4 h-4" /> رفع صورة جديدة
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try {
                                                        setLoading(true);
                                                        const url = await inventoryService.uploadImage(file);
                                                        setFormData({ ...formData, imageUrl: url });
                                                    } catch (err: any) {
                                                        setError(err.message);
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                    <p className="text-[10px] text-stone-400 font-medium leading-relaxed">
                                        يفضل استخدام صور عالية الجودة بصيغة JPG أو PNG. <br/>
                                        سيتم تخزين الصورة بشكل آمن في سحابة التخزين.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest">فترة التنظيف (أيام) *</label>
                            <input
                                type="number" required min={0} max={14} value={formData.cleaningBufferDays}
                                onChange={(e) => setFormData({ ...formData, cleaningBufferDays: Number(e.target.value) })}
                                className="w-full h-12 px-5 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-900 transition-all"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest">الوصف</label>
                            <textarea
                                rows={3} value={formData.description ?? ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full p-5 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-900 transition-all text-sm resize-none"
                                placeholder="تفاصيل التصميم، القماش، المناسبة..."
                            />
                        </div>
                    </div>

                    {!initialData && (
                        <div className="space-y-4 pt-6 border-t border-stone-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">القطع والمقاسات المتوفرة</h3>
                                    <p className="text-xs text-stone-500 mt-1">أضف كل مقاس يتوفر لديك حالياً.</p>
                                </div>
                                <button type="button" onClick={addItemRow}
                                    className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors">
                                    <Plus className="w-4 h-4" /> إضافة مقاس
                                </button>
                            </div>
                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-center animate-in">
                                        <div className="flex-1 grid grid-cols-3 gap-3">
                                            <input
                                                placeholder="المقاس *" required value={item.size}
                                                onChange={(e) => updateItem(idx, 'size', e.target.value)}
                                                className="h-11 px-4 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:border-stone-900 focus:bg-white text-sm"
                                            />
                                            <input
                                                placeholder="اللون" value={item.color}
                                                onChange={(e) => updateItem(idx, 'color', e.target.value)}
                                                className="h-11 px-4 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:border-stone-900 focus:bg-white text-sm"
                                            />
                                            <input
                                                placeholder="رمز SKU" value={item.sku}
                                                onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                                                className="h-11 px-4 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:border-stone-900 focus:bg-white text-sm"
                                            />
                                        </div>
                                        {items.length > 1 && (
                                            <button type="button" onClick={() => removeItemRow(idx)}
                                                className="p-2 text-stone-300 hover:text-rose-500 transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-8 bg-stone-50 border-t border-stone-100 flex gap-4">
                    <button type="button" onClick={onCancel}
                        className="flex-1 h-12 border border-stone-200 rounded-xl font-bold text-stone-500 text-sm hover:bg-white transition-all">
                        إلغاء التغييرات
                    </button>
                    <button type="submit" disabled={loading}
                        className="flex-1 h-12 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {initialData ? 'تحديث البيانات' : 'حفظ وإضافة للمخزون'}
                    </button>
                </footer>
            </form>
        </div>
    );
}
