import { db, DEFAULT_CATEGORIES } from '../db/db';
import { todayISO } from './format';
import { ensureOpeningBalances } from './balances';

const BACKUP_FORMAT = 'gestionbudget-backup';
const TABLES = ['accounts', 'securities', 'transactions', 'recurringItems', 'goals', 'categories', 'budgets', 'snapshots', 'meta'] as const;
type TableName = (typeof TABLES)[number];

interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  tables: Record<TableName, unknown[]>;
}

// Full JSON snapshot of the database, restorable with importBackup (unlike the CSV exports).
export async function exportBackup() {
  const tables = {} as Record<TableName, unknown[]>;
  for (const name of TABLES) tables[name] = await db.table(name).toArray();
  const backup: Backup = { format: BACKUP_FORMAT, version: db.verno, exportedAt: new Date().toISOString(), tables };

  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-sauvegarde-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Replaces every table with the backup's content. Tables missing from an older backup
// (e.g. categories) are left untouched.
export async function importBackup(file: File): Promise<void> {
  let data: Backup;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide.");
  }
  if (data?.format !== BACKUP_FORMAT || typeof data.tables !== 'object') {
    throw new Error("Ce fichier n'est pas une sauvegarde de l'application.");
  }
  if (data.version > db.verno) {
    throw new Error("Cette sauvegarde provient d'une version plus récente de l'app. Mettez l'app à jour d'abord.");
  }

  await db.transaction('rw', TABLES.map((n) => db.table(n)), async () => {
    for (const name of TABLES) {
      const rows = data.tables[name];
      if (!Array.isArray(rows)) continue;
      await db.table(name).clear();
      await db.table(name).bulkAdd(rows);
    }
  });
  // Backups made before opening balances existed.
  await ensureOpeningBalances();
}

// Erases every table and restores the default categories, as on a fresh install.
export async function resetAllData(): Promise<void> {
  await db.transaction('rw', TABLES.map((n) => db.table(n)), async () => {
    for (const name of TABLES) await db.table(name).clear();
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  });
}

// Asks the browser not to evict IndexedDB under storage pressure. Granted silently for
// installed PWAs on most browsers; a no-op where unsupported.
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
