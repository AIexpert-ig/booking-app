import {
    collection, query, orderBy, limit, getDocs,
    doc, getDoc, addDoc, updateDoc, deleteDoc, where, Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase-bridge';
import { BookingWithDress, Dress, Reservation } from '../types';

// Internal cache for optimistic updates and offline-ready behavior
let bookingsCache: BookingWithDress[] = [];

export const bookingService = {
    /** Get cached bookings or fetch from Firestore if cache is empty */
    async fetchRecentBookings(forceRefresh = false): Promise<BookingWithDress[]> {
        if (bookingsCache.length > 0 && !forceRefresh) {
            return bookingsCache;
        }

        try {
            const q = query(collection(db, 'reservations'), orderBy('startDate', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const resData = docSnap.data() as Reservation;
                const dressSnap = await getDoc(doc(db, 'dresses', resData.dressId));
                return {
                    id: docSnap.id,
                    ...resData,
                    dress: dressSnap.exists() ? { id: dressSnap.id, ...dressSnap.data() } as Dress : undefined
                };
            }));
            bookingsCache = data;
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            return bookingsCache;
        }
    },

    async createReservation(data: Omit<Reservation, 'id' | 'createdAt'>): Promise<string> {
        try {
            // Explicit payload mapping (Sanitize Payload)
            const payload = {
                itemId: data.itemId,
                dressId: data.dressId,
                customer_name: data.customer_name,
                customerEmail: data.customerEmail,
                startDate: data.startDate instanceof Date ? Timestamp.fromDate(data.startDate) : data.startDate,
                endDate: data.endDate instanceof Date ? Timestamp.fromDate(data.endDate) : data.endDate,
                bufferEndDate: data.bufferEndDate instanceof Date ? Timestamp.fromDate(data.bufferEndDate) : data.bufferEndDate,
                totalPrice: Number(data.totalPrice),
                status: data.status || 'confirmed',
                createdAt: Timestamp.now(),
            };
            
            const docRef = await addDoc(collection(db, 'reservations'), payload);
            
            // Update local cache for immediate UI feedback
            const newBooking: BookingWithDress = { id: docRef.id, ...payload as unknown as Reservation };
            bookingsCache = [newBooking, ...bookingsCache];
            
            return docRef.id;
        } catch (error) {
            handleFirestoreError(OperationType.CREATE, error, 'reservations');
            throw error;
        }
    },

    async updateReservation(id: string, updates: Partial<Reservation>): Promise<void> {
        try {
            // Explicitly map sanitized updates
            const payload: any = {};
            if (updates.customer_name !== undefined) payload.customer_name = updates.customer_name;
            if (updates.status !== undefined) payload.status = updates.status;
            if (updates.startDate !== undefined) payload.startDate = updates.startDate;
            if (updates.endDate !== undefined) payload.endDate = updates.endDate;
            if (updates.bufferEndDate !== undefined) payload.bufferEndDate = updates.bufferEndDate;

            // Optimistic update
            const originalCache = [...bookingsCache];
            bookingsCache = bookingsCache.map(b => b.id === id ? { ...b, ...payload } : b);
            
            try {
                const docRef = doc(db, 'reservations', id);
                await updateDoc(docRef, payload);
            } catch (error) {
                bookingsCache = originalCache; // Rollback on failure
                throw error;
            }
        } catch (error) {
            handleFirestoreError(OperationType.UPDATE, error, 'reservations');
            throw error;
        }
    },

    async deleteReservation(id: string): Promise<void> {
        try {
            // Optimistic update
            const originalCache = [...bookingsCache];
            bookingsCache = bookingsCache.filter(b => b.id !== id);
            
            try {
                await deleteDoc(doc(db, 'reservations', id));
            } catch (error) {
                bookingsCache = originalCache; // Rollback
                throw error;
            }
        } catch (error) {
            handleFirestoreError(OperationType.DELETE, error, 'reservations');
            throw error;
        }
    },

    /** Check availability with 24-hour maintenance buffer implementation */
    async isItemAvailable(itemId: string, startDate: Date, bufferEndDate: Date): Promise<boolean> {
        try {
            const q = query(
                collection(db, 'reservations'),
                where('itemId', '==', itemId),
                where('status', '==', 'confirmed'),
                where('startDate', '<=', Timestamp.fromDate(bufferEndDate)),
                where('bufferEndDate', '>=', Timestamp.fromDate(startDate))
            );
            const snap = await getDocs(q);
            return snap.empty;
        } catch (error) {
            console.error('Availability check error:', error);
            return false;
        }
    }
};
