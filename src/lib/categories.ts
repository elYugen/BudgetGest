import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { TxType } from '../db/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../db/types';

const DEFAULTS: Record<TxType, string[]> = { expense: EXPENSE_CATEGORIES, income: INCOME_CATEGORIES };

// Category names for a transaction type, in creation order. Falls back to the built-in
// list while the query is loading so forms always have something to preselect.
export function useCategories(type: TxType): string[] {
  const rows = useLiveQuery(() => db.categories.where('type').equals(type).sortBy('id'), [type]);
  return rows && rows.length > 0 ? rows.map((c) => c.name) : DEFAULTS[type];
}

export async function addCategory(type: TxType, rawName: string): Promise<string | null> {
  const name = rawName.trim();
  if (!name) return 'Merci de nommer la catégorie.';
  const exists = await db.categories.where('[type+name]').equals([type, name]).count();
  if (exists) return 'Cette catégorie existe déjà.';
  await db.categories.add({ type, name });
  return null;
}

// Existing transactions keep their category label; only the choice in forms disappears.
export async function deleteCategory(id: number) {
  await db.transaction('rw', db.categories, db.budgets, async () => {
    const cat = await db.categories.get(id);
    if (!cat) return;
    await db.categories.delete(id);
    if (cat.type === 'expense') await db.budgets.where('category').equals(cat.name).delete();
  });
}

export async function setBudget(category: string, amount: number | null) {
  const existing = await db.budgets.where('category').equals(category).first();
  if (!amount || amount <= 0) {
    if (existing) await db.budgets.delete(existing.id!);
  } else if (existing) {
    await db.budgets.update(existing.id!, { amount });
  } else {
    await db.budgets.add({ category, amount });
  }
}
