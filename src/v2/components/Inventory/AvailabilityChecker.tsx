import React, { useState } from 'react';
import { Timestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase-bridge';
import { Dress, InventoryItem } from '../../types';
import { bookingService } from '../../services/bookingService';
import { Calendar, CheckCircle2, XCircle, Loader2, ShoppingBag, AlertTriangle } from 'lucide-react';

interface Props {
    dress: Dress;
}

interface AvailableSlot {
    item: InventoryItem;
    available: boolean;
}

export default function AvailabilityChecker({ dress }: Props) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [checking, setChecking] = useState(false);
    const [booking, setBooking] = useState(false);
    const [slots, setSlots] = useState<AvailableSlot[]>([]);
    const [hasChecked, setHasChecked] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [customer_name, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const totalDays = startDate && endDate
        ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
        : 0;
    const totalPrice = totalDays * dress.basePrice;

    const checkAvailability = async () => {
        if (!startDate || !endDate) return;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) { 
            setErrorMessage('تاريخ النهاية يجب أن يكون بعد تاريخ البداية.'); 
            return; 
        }

        setChecking(true);
        setHasChecked(false);
        setSelectedItem(null);
        setBookingSuccess(false);
        setErrorMessage('');

        try {
            const itemsSnap = await getDocs(
                query(collection(db, 'inventory_items'),
                    where('dressId', '==', dress.id),
                    where('status', '==', 'available'))
            );
            const allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));

            // Maintenance buffer calculation
            const bufferEnd = new Date(end);
            bufferEnd.setDate(bufferEnd.getDate() + (dress.cleaningBufferDays || 1));

            const results = await Promise.all(
                allItems.map(async (item) => ({
                    item,
                    available: await bookingService.isItemAvailable(item.id, start, bufferEnd)
                }))
            );

            const isBlockedByBuffer = results.every(r => !r.available);
            if (isBlockedByBuffer) {
                // Heuristic check: see if it overlaps specifically with a buffer
                setErrorMessage('تاريخ غير صالح: مطلوب فترة صيانة 24 ساعة.');
            }

            setSlots(results);
            setHasChecked(true);
        } catch (error) {
            console.error('Error checking availability:', error);
            setErrorMessage('فشل التحقق من التوفر. يرجى المحاولة مرة أخرى.');
        } finally {
            setChecking(false);
        }
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !startDate || !endDate || !customer_name || !customerEmail) return;

        setBooking(true);
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const bufferEnd = new Date(end);
            bufferEnd.setDate(bufferEnd.getDate() + (dress.cleaningBufferDays || 1));

            await bookingService.createReservation({
                itemId: selectedItem.id,
                dressId: dress.id,
                customer_name,
                customerEmail,
                startDate: Timestamp.fromDate(start),
                endDate: Timestamp.fromDate(end),
                bufferEndDate: Timestamp.fromDate(bufferEnd),
                totalPrice,
                status: 'confirmed',
            });

            setBookingSuccess(true);
            setSelectedItem(null);
            setCustomerName('');
            setCustomerEmail('');
            await checkAvailability();
        } catch (error) {
            console.error('Booking error:', error);
            setErrorMessage('فشل إتمام الحجز. يرجى المحاولة مرة أخرى.');
        } finally {
            setBooking(false);
        }
    };

    const availableSlots = slots.filter(s => s.available);

    return (
        <div className="space-y-6 pt-6 border-t border-stone-100 text-right" dir="rtl">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">تاريخ البداية</label>
                    <input type="date" value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setHasChecked(false); setErrorMessage(''); }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full h-11 px-4 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-900 transition-all" />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">تاريخ النهاية</label>
                    <input type="date" value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setHasChecked(false); setErrorMessage(''); }}
                        min={startDate || new Date().toISOString().split('T')[0]}
                        className="w-full h-11 px-4 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-900 transition-all" />
                </div>
            </div>

            {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 animate-in">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <p className="text-rose-700 text-sm font-medium">{errorMessage}</p>
                </div>
            )}

            {totalDays > 0 && !errorMessage && (
                <div className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100 text-sm">
                    <span className="text-stone-500">المدة: {totalDays} يوم</span>
                    <span className="font-bold text-stone-900">الإجمالي: {totalPrice.toFixed(2)} ج.م</span>
                </div>
            )}

            <button onClick={checkAvailability} disabled={!startDate || !endDate || checking}
                className="w-full h-12 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                التحقق من التوفر
            </button>

            {bookingSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 animate-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-emerald-700 text-sm font-medium">تم تأكيد الحجز بنجاح!</p>
                </div>
            )}

            {hasChecked && !errorMessage && (
                <div className="space-y-4 animate-in">
                    {availableSlots.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                                <CheckCircle2 className="w-4 h-4" />
                                يتوفر {availableSlots.length} مقاس(ات) جاهزة للحجز
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {availableSlots.map(({ item }) => (
                                    <button key={item.id} type="button"
                                        onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                        className={`h-10 px-4 rounded-lg text-xs font-bold border transition-all ${selectedItem?.id === item.id
                                            ? 'bg-stone-900 text-white border-stone-900'
                                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-900'}`}>
                                        مقاس {item.size}{item.color ? ` · ${item.color}` : ''}
                                    </button>
                                ))}
                            </div>

                            {selectedItem && (
                                <form onSubmit={handleBook} className="p-6 bg-stone-50 border border-stone-200 rounded-xl space-y-4 mt-2">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">إتمام الحجز - مقاس {selectedItem.size}</h4>
                                    <div className="space-y-3">
                                        <input required placeholder="اسم العميل الكامل" value={customer_name}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full h-11 px-4 bg-white border border-stone-200 rounded-lg outline-none focus:border-stone-900 text-sm" />
                                        <input required type="email" placeholder="البريد الإلكتروني" value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            className="w-full h-11 px-4 bg-white border border-stone-200 rounded-lg outline-none focus:border-stone-900 text-sm" />
                                    </div>
                                    <button type="submit" disabled={booking}
                                        className="w-full h-12 bg-stone-900 text-white rounded-lg text-sm font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
                                        {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
                                        تأكيد الحجز والدفع
                                    </button>
                                </form>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest p-4 bg-rose-50 rounded-xl border border-rose-100">
                            <XCircle className="w-5 h-5" /> لا تتوفر مقاسات لهذه التواريخ المطلوبة
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
