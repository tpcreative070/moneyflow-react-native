// src/utils/database.js
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);
let _db = null;

export async function getDb() {
  if (_db) return _db;
  _db = await SQLite.openDatabase({ name: 'moneyflow.db', location: 'default' });
  await _init(_db);
  return _db;
}

async function _init(db) {
  await db.executeSql(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, amount REAL NOT NULL, date TEXT NOT NULL,
    note TEXT DEFAULT '', categoryId TEXT NOT NULL, categoryName TEXT NOT NULL,
    type TEXT NOT NULL, walletId TEXT DEFAULT 'default',
    synced INTEGER DEFAULT 0, attachmentBase64 TEXT,
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  );`);
  await db.executeSql(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
    icon TEXT NOT NULL, colorHex TEXT NOT NULL,
    isDefault INTEGER DEFAULT 0, createdAt TEXT NOT NULL
  );`);
  await db.executeSql(`CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY, monthlyLimit REAL DEFAULT 0,
    yearlyLimit REAL DEFAULT 0, notifyAt REAL DEFAULT 0.8
  );`);
}

// ── Transactions ──────────────────────────────────────────────
export async function upsertTransaction(tx) {
  const db = await getDb();
  await db.executeSql(
    `INSERT OR REPLACE INTO transactions
     (id,amount,date,note,categoryId,categoryName,type,walletId,synced,attachmentBase64,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [tx.id, tx.amount, tx.date, tx.note ?? '', tx.categoryId, tx.categoryName,
     tx.type, tx.walletId ?? 'default', tx.synced ? 1 : 0,
     tx.attachmentBase64 ?? null, tx.createdAt, tx.updatedAt]
  );
}

export async function deleteTransactionById(id) {
  const db = await getDb();
  await db.executeSql('DELETE FROM transactions WHERE id=?', [id]);
}

export async function fetchAllTransactions() {
  const db = await getDb();
  const [res] = await db.executeSql('SELECT * FROM transactions ORDER BY date DESC, createdAt DESC');
  return Array.from({ length: res.rows.length }, (_, i) => {
    const r = res.rows.item(i);
    return { ...r, synced: r.synced === 1 };
  });
}

// ── Categories ────────────────────────────────────────────────
export async function upsertCategory(cat) {
  const db = await getDb();
  await db.executeSql(
    `INSERT OR REPLACE INTO categories (id,name,type,icon,colorHex,isDefault,createdAt)
     VALUES (?,?,?,?,?,?,?)`,
    [cat.id, cat.name, cat.type, cat.icon, cat.colorHex, cat.isDefault ? 1 : 0, cat.createdAt]
  );
}

export async function deleteCategoryById(id) {
  const db = await getDb();
  await db.executeSql('DELETE FROM categories WHERE id=? AND isDefault=0', [id]);
}

export async function fetchAllCategories() {
  const db = await getDb();
  const [res] = await db.executeSql('SELECT * FROM categories ORDER BY name ASC');
  return Array.from({ length: res.rows.length }, (_, i) => {
    const r = res.rows.item(i);
    return { ...r, isDefault: r.isDefault === 1 };
  });
}

export async function countTransactionsByCategory(categoryId) {
  const db = await getDb();
  const [res] = await db.executeSql(
    'SELECT COUNT(*) as c FROM transactions WHERE categoryId=?', [categoryId]
  );
  return res.rows.item(0).c;
}

// ── Budget ────────────────────────────────────────────────────
export async function fetchBudget() {
  const db = await getDb();
  const [res] = await db.executeSql("SELECT * FROM budgets WHERE id='main'");
  return res.rows.length ? res.rows.item(0) : { monthlyLimit: 0, yearlyLimit: 0, notifyAt: 0.8 };
}

export async function saveBudgetRecord(b) {
  const db = await getDb();
  await db.executeSql(
    `INSERT OR REPLACE INTO budgets (id,monthlyLimit,yearlyLimit,notifyAt) VALUES ('main',?,?,?)`,
    [b.monthlyLimit, b.yearlyLimit, b.notifyAt]
  );
}

// ── Wipe on sign-out ──────────────────────────────────────────
export async function wipeAllLocalData() {
  const db = await getDb();
  await db.executeSql('DELETE FROM transactions');
  await db.executeSql('DELETE FROM categories');
  await db.executeSql('DELETE FROM budgets');
}
