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
            return snapshot.docs.map(d => ({ 
                id: d.id, 
                ...d.data() 
            } as Dress));
        } catch (error) {
            handleFirestoreError(OperationType.LIST, error, 'dresses');
            return [];
        }
    },

    async uploadImage(file: File): Promise<string> {
        try {
            const storageRef = ref(storage, `dresses/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            // Return absolute Public URL
            return await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error('Image upload error:', error);
            throw new Error('فشل رفع الصورة. يرجى المحاولة مرة أخرى.');
        }
    },

    async addDress(dress: Omit<Dress, 'id'>): Promise<string> {
        try {
            // Explicitly map database columns (Sanitize Payload)
            const payload = {
                name: dress.name,
                description: dress.description || '',
                category: dress.category,
                basePrice: Number(dress.basePrice),
                cleaningBufferDays: Number(dress.cleaningBufferDays),
                image_url: dress.image_url || null,
                createdAt: Timestamp.now()
            };
            const docRef = await addDoc(collection(db, 'dresses'), payload);
            return docRef.id;
        } catch (error) {
            handleFirestoreError(OperationType.CREATE, error, 'dresses');
            throw error;
        }
    },

    async updateDress(id: string, dress: Partial<Omit<Dress, 'id'>>): Promise<void> {
        try {
            // Explicitly map database columns (Sanitize Payload)
            const payload: any = {};
            if (dress.name !== undefined) payload.name = dress.name;
            if (dress.description !== undefined) payload.description = dress.description;
            if (dress.category !== undefined) payload.category = dress.category;
            if (dress.basePrice !== undefined) payload.basePrice = Number(dress.basePrice);
            if (dress.cleaningBufferDays !== undefined) payload.cleaningBufferDays = Number(dress.cleaningBufferDays);
            if (dress.image_url !== undefined) payload.image_url = dress.image_url;

            await updateDoc(doc(db, 'dresses', id), payload);
        } catch (error) {
            handleFirestoreError(OperationType.UPDATE, error, 'dresses');
            throw error;
        }
    },

    async fetchInventoryItems(dressId: string): Promise<InventoryItem[]> {
        try {
            const q = query(collection(db, 'inventory_items'), where('dressId', '==', dressId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
        } catch (error) {
            handleFirestoreError(OperationType.LIST, error, 'inventory_items');
            return [];
        }
    },

    async addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<string> {
        try {
            const payload = {
                dressId: item.dressId,
                size: item.size,
                color: item.color || '',
                sku: item.sku || '',
                status: item.status || 'available'
            };
            const docRef = await addDoc(collection(db, 'inventory_items'), payload);
            return docRef.id;
        } catch (error) {
            handleFirestoreError(OperationType.CREATE, error, 'inventory_items');
            throw error;
        }
    }
};
