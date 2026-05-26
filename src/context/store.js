// src/context/store.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultCategories } from '../constants/theme';
import {
  fetchAllTransactions, upsertTransaction, deleteTransactionById,
  fetchAllCategories, upsertCategory, deleteCategoryById,
  fetchBudget, saveBudgetRecord,
  wipeAllLocalData,
} from '../utils/database';
import { uploadTransaction, removeTransaction } from '../utils/api'; // ← your Firestore/REST helpers

// ─── tiny uuid ────────────────────────────────────────────────
export const genId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

// ─── Auth ─────────────────────────────────────────────────────
export const useAuthStore = create((set) => ({
  user: null,
  isGuest: false,
  loading: false,
  setUser:  (user) => set({ user, isGuest: false, loading: false }),
  setGuest: ()     => set({ user: { uid: 'guest_demo', displayName: 'Guest', email: '' }, isGuest: true, loading: false }),
  setLoading: (v)  => set({ loading: v }),
  signOut: async () => {
    await wipeAllLocalData();
    await AsyncStorage.multiRemove(['tx_pending_upload', 'tx_pending_delete', 'app_currency']);
    set({ user: null, isGuest: false, loading: false });
  },
}));

// ─── Currency ─────────────────────────────────────────────────
export const useCurrencyStore = create((set) => ({
  code: 'VND',
  init: async () => {
    const v = await AsyncStorage.getItem('app_currency');
    if (v) set({ code: v });
  },
  setCode: async (code) => {
    set({ code });
    await AsyncStorage.setItem('app_currency', code);
  },
}));

// ─── Network ──────────────────────────────────────────────────
export const useNetworkStore = create((set) => ({
  isConnected: true,
  setConnected: (v) => set({ isConnected: v }),
}));

// ─── Transactions ─────────────────────────────────────────────
export const useTransactionStore = create((set, get) => ({
  transactions: [],
  pendingUpload: new Set(),
  pendingDelete: new Set(),
  syncing: false,

  load: async () => {
    const txs = await fetchAllTransactions();
    const pu = await AsyncStorage.getItem('tx_pending_upload');
    const pd = await AsyncStorage.getItem('tx_pending_delete');
    set({
      transactions: txs,
      pendingUpload: new Set(pu ? JSON.parse(pu) : []),
      pendingDelete: new Set(pd ? JSON.parse(pd) : []),
    });
  },

  add: async (tx) => {
    // Always save locally first; mark synced: false until upload succeeds
    const localTx = { ...tx, synced: false };
    await upsertTransaction(localTx);
    const pu = new Set([...get().pendingUpload, tx.id]);
    await AsyncStorage.setItem('tx_pending_upload', JSON.stringify([...pu]));
    set(s => ({ transactions: [localTx, ...s.transactions], pendingUpload: pu }));
  },

  update: async (tx) => {
    const localTx = { ...tx, synced: false };
    await upsertTransaction(localTx);
    const pu = new Set([...get().pendingUpload, tx.id]);
    await AsyncStorage.setItem('tx_pending_upload', JSON.stringify([...pu]));
    set(s => ({
      transactions: s.transactions.map(t => t.id === tx.id ? localTx : t),
      pendingUpload: pu,
    }));
  },

  remove: async (id) => {
    await deleteTransactionById(id);
    const pd = new Set([...get().pendingDelete, id]);
    await AsyncStorage.setItem('tx_pending_delete', JSON.stringify([...pd]));
    // Also drop from pendingUpload — never-synced deletions don't need a remote call
    const pu = new Set([...get().pendingUpload].filter(i => i !== id));
    await AsyncStorage.setItem('tx_pending_upload', JSON.stringify([...pu]));
    set(s => ({
      transactions: s.transactions.filter(t => t.id !== id),
      pendingDelete: pd,
      pendingUpload: pu,
    }));
  },

  // ── Call after add/update (when online), or on app foreground / reconnect ──
  syncPending: async () => {
    if (get().syncing) return;
    set({ syncing: true });
    try {
      const { transactions, pendingUpload, pendingDelete } = get();

      // ── 1. Upload / upsert pending transactions ──────────────
      const uploadIds = [...pendingUpload];
      const uploadedOk = new Set();

      for (const id of uploadIds) {
        const tx = transactions.find(t => t.id === id);
        if (!tx) { uploadedOk.add(id); continue; } // deleted locally, skip
        try {
          await uploadTransaction(tx);           // your Firestore / REST call
          const synced = { ...tx, synced: true };
          await upsertTransaction(synced);        // persist synced: true locally
          set(s => ({
            transactions: s.transactions.map(t => t.id === id ? synced : t),
          }));
          uploadedOk.add(id);
        } catch (err) {
          console.warn('[sync] upload failed for', id, err);
          // Leave in pendingUpload — will retry on next syncPending call
        }
      }

      const remainingUpload = new Set([...pendingUpload].filter(id => !uploadedOk.has(id)));
      await AsyncStorage.setItem('tx_pending_upload', JSON.stringify([...remainingUpload]));
      set({ pendingUpload: remainingUpload });

      // ── 2. Delete pending removals from remote ───────────────
      const deleteIds = [...pendingDelete];
      const deletedOk = new Set();

      for (const id of deleteIds) {
        try {
          await removeTransaction(id);           // your Firestore / REST call
          deletedOk.add(id);
        } catch (err) {
          console.warn('[sync] remote delete failed for', id, err);
        }
      }

      const remainingDelete = new Set([...pendingDelete].filter(id => !deletedOk.has(id)));
      await AsyncStorage.setItem('tx_pending_delete', JSON.stringify([...remainingDelete]));
      set({ pendingDelete: remainingDelete });

    } finally {
      set({ syncing: false });
    }
  },
}));

// ─── Categories ───────────────────────────────────────────────
export const useCategoryStore = create((set) => ({
  categories: [],

  load: async () => {
    let cats = await fetchAllCategories();
    if (cats.length === 0) {
      const now = new Date().toISOString();
      for (const c of DefaultCategories) await upsertCategory({ ...c, createdAt: now });
      cats = await fetchAllCategories();
    }
    set({ categories: cats });
  },

  add: async (cat) => {
    await upsertCategory(cat);
    set(s => ({ categories: [...s.categories, cat] }));
  },

  update: async (cat) => {
    await upsertCategory(cat);
    set(s => ({ categories: s.categories.map(c => c.id === cat.id ? cat : c) }));
  },

  remove: async (id) => {
    await deleteCategoryById(id);
    set(s => ({ categories: s.categories.filter(c => c.id !== id) }));
  },
}));

// ─── Budget ───────────────────────────────────────────────────
export const useBudgetStore = create((set) => ({
  budget: { monthlyLimit: 0, yearlyLimit: 0, notifyAt: 0.8 },
  load:   async () => { const b = await fetchBudget(); set({ budget: b }); },
  save:   async (b) => { await saveBudgetRecord(b); set({ budget: b }); },
}));