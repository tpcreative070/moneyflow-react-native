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
    await upsertTransaction(tx);
    const pu = new Set([...get().pendingUpload, tx.id]);
    await AsyncStorage.setItem('tx_pending_upload', JSON.stringify([...pu]));
    set(s => ({ transactions: [tx, ...s.transactions], pendingUpload: pu }));
  },

  update: async (tx) => {
    await upsertTransaction(tx);
    const pu = new Set([...get().pendingUpload, tx.id]);
    await AsyncStorage.setItem('tx_pending_upload', JSON.stringify([...pu]));
    set(s => ({ transactions: s.transactions.map(t => t.id === tx.id ? tx : t), pendingUpload: pu }));
  },

  remove: async (id) => {
    await deleteTransactionById(id);
    const pd = new Set([...get().pendingDelete, id]);
    await AsyncStorage.setItem('tx_pending_delete', JSON.stringify([...pd]));
    set(s => ({ transactions: s.transactions.filter(t => t.id !== id), pendingDelete: pd }));
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