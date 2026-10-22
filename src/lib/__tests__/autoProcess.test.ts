import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/db';
import { processRecurringItems } from '../autoProcess';

async function setup() {
  const accountId = (await db.accounts.add({ name: 'Courant', type: 'courant', balance: 0, color: '#000', icon: 'wallet', createdAt: '' }))!;
  await db.recurringItems.add({
    kind: 'income', label: 'Salaire', amount: 2000, dayOfMonth: 28, category: 'Salaire', color: '#000', emoji: '💰', accountId, active: true,
  });
  await db.recurringItems.add({
    kind: 'expense', label: 'Loyer', amount: 800, dayOfMonth: 31, category: 'Logement', color: '#000', emoji: '🏠', accountId, active: true,
  });
  return accountId;
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('processRecurringItems', () => {
  it('only processes items whose day has come on the first run', async () => {
    const accountId = await setup();
    await processRecurringItems(new Date(2026, 9, 15));
    expect(await db.transactions.count()).toBe(0);
    await processRecurringItems(new Date(2026, 9, 28, 9));
    expect(await db.transactions.count()).toBe(1);
    expect((await db.accounts.get(accountId))?.balance).toBe(2000);
  });

  it('catches up months skipped while the app was closed', async () => {
    const accountId = await setup();
    await processRecurringItems(new Date(2026, 8, 10)); // 10 Sept: nothing due yet
    await processRecurringItems(new Date(2026, 10, 2)); // 2 Nov: Sept and Oct are due

    const dates = (await db.transactions.orderBy('date').toArray()).map((t) => `${t.label} ${t.date}`);
    expect(dates).toEqual(['Salaire 2026-09-28', 'Loyer 2026-09-30', 'Salaire 2026-10-28', 'Loyer 2026-10-31']);
    expect((await db.accounts.get(accountId))?.balance).toBe(2 * (2000 - 800));
  });

  it('never creates duplicates when called concurrently or repeatedly', async () => {
    await setup();
    const now = new Date(2026, 9, 31, 12);
    await Promise.all([processRecurringItems(now), processRecurringItems(now), processRecurringItems(now)]);
    await processRecurringItems(now);
    expect(await db.transactions.count()).toBe(2);
  });

  it('ignores inactive items', async () => {
    await setup();
    await db.recurringItems.toCollection().modify({ active: false });
    await processRecurringItems(new Date(2026, 9, 31, 12));
    expect(await db.transactions.count()).toBe(0);
  });
});
