import {
    collection, query, orderBy, limit, getDocs,
    doc, getDoc, addDoc, updateDoc, deleteDoc, where, Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase-bridge';
import { BookingWithDress, Dress, Reservation } from '../types';

// Internal cache for optimistic updates and offline-like behavior
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
            // Return cache if it exists, otherwise empty array
            return bookingsCache;
        }
    },

    async createReservation(data: Omit<Reservation, 'id' | 'createdAt'>): Promise<string> {
        try {
            const resToSave = {
                ...data,
                startDate: data.startDate instanceof Date ? Timestamp.fromDate(data.startDate) : data.startDate,
                endDate: data.endDate instanceof Date ? Timestamp.fromDate(data.endDate) : data.endDate,
                bufferEndDate: data.bufferEndDate instanceof Date ? Timestamp.fromDate(data.bufferEndDate) : data.bufferEndDate,
                createdAt: Timestamp.now(),
            };
            const docRef = await addDoc(collection(db, 'reservations'), resToSave);
            
            // Update local cache
            const newBooking: BookingWithDress = { id: docRef.id, ...resToSave as Reservation };
            bookingsCache = [newBooking, ...bookingsCache];
            
            return docRef.id;
        } catch (error) {
            handleFirestoreError(OperationType.CREATE, error, 'reservations');
            throw error;
        }
    },

    async updateReservation(id: string, updates: Partial<Reservation>): Promise<void> {
        try {
            // Optimistic update
            bookingsCache = bookingsCache.map(b => b.id === id ? { ...b, ...updates } : b);
            
            // Persist to Firestore
            const docRef = doc(db, 'reservations', id);
            await updateDoc(docRef, updates as Record<string, unknown>);
        } catch (error) {
            // Rollback cache on error (simple re-fetch)
            await this.fetchRecentBookings(true);
            handleFirestoreError(OperationType.UPDATE, error, 'reservations');
            throw error;
        }
    },

    async deleteReservation(id: string): Promise<void> {
        try {
            // Optimistic update
            bookingsCache = bookingsCache.filter(b => b.id !== id);
            
            // Persist to Firestore
            await deleteDoc(doc(db, 'reservations', id));
        } catch (error) {
            // Rollback cache on error
            await this.fetchRecentBookings(true);
            handleFirestoreError(OperationType.DELETE, error, 'reservations');
            throw error;
        }
    },

    /** Check if a specific item is already booked during the proposed window (incl. buffer). */
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

