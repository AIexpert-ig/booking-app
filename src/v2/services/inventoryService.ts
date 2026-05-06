import {
    collection, getDocs, addDoc, updateDoc,
    doc, query, where, Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase-bridge';
import { Dress, InventoryItem } from '../types';

export const inventoryService = {
    async fetchDresses(): Promise<Dress[]> {
        try {
            const snapshot = await getDocs(collection(db, 'dresses'));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dress));
        } catch (error) {
            handleFirestoreError(OperationType.LIST, error, 'dresses');
        }
    },

    async uploadImage(file: File): Promise<string> {
        try {
            const storageRef = ref(storage, `dresses/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error('Image upload error:', error);
            throw new Error('فشل رفع الصورة. يرجى المحاولة مرة أخرى.');
        }
    },

    async addDress(dress: Omit<Dress, 'id'>): Promise<string> {
        try {
            const data = {
                ...dress,
                createdAt: Timestamp.now()
            };
            const sanitizedData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
            const docRef = await addDoc(collection(db, 'dresses'), sanitizedData);
            return docRef.id;
        } catch (error) {
            handleFirestoreError(OperationType.CREATE, error, 'dresses');
        }
    },

    async updateDress(id: string, dress: Partial<Omit<Dress, 'id'>>): Promise<void> {
        try {
            await updateDoc(doc(db, 'dresses', id), dress as Record<string, unknown>);
        } catch (error) {
            handleFirestoreError(OperationType.UPDATE, error, 'dresses');
        }
    },

    async fetchInventoryItems(dressId: string): Promise<InventoryItem[]> {
        try {
            const q = query(collection(db, 'inventory_items'), where('dressId', '==', dressId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
        } catch (error) {
            handleFirestoreError(OperationType.LIST, error, 'inventory_items');
        }
    },

    async addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<string> {
        try {
            const sanitizedData = Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
            const docRef = await addDoc(collection(db, 'inventory_items'), sanitizedData);
            return docRef.id;
        } catch (error) {
            handleFirestoreError(OperationType.CREATE, error, 'inventory_items');
        }
    }
};
