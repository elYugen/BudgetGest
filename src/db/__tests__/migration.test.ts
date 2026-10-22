import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it } from 'vitest';

it('upgrades a v2 database: keeps data, seeds categories, adds brand logos and opening balances', async () => {
  const old = new Dexie('budgetDB');
  old.version(1).stores({
    accounts: '++id, type',
    securities: '++id, accountId',
    transactions: '++id, accountId, date, type, recurringItemId',
    recurringItems: '++id, kind, dayOfMonth',
  });
  old.version(2).stores({ goals: '++id, accountId' });
  await old.open();
  const accountId = await old.table('accounts').add({ name: 'A', type: 'courant', balance: 1234.56, color: '#000', icon: 'wallet', createdAt: '' });
  await old.table('transactions').bulkAdd([
    { accountId, date: '2026-10-01', amount: 10, type: 'expense', category: 'Autre', label: 'x' },
    { accountId, date: '2026-10-02', amount: 2000, type: 'income', category: 'Salaire', label: 'y' },
  ]);
  await old.table('recurringItems').bulkAdd([
    { kind: 'subscription', label: 'Disney+', amount: 9, dayOfMonth: 1, category: 'Streaming', color: '#000', emoji: '🏰', active: true },
    { kind: 'subscription', label: 'Amazon Prime', amount: 7, dayOfMonth: 1, category: 'Streaming', color: '#000', emoji: '📦', active: true },
  ]);
  old.close();

  const { db } = await import('../db');
  await db.open();
  expect(db.verno).toBe(4);
  expect(await db.transactions.count()).toBe(2);
  const account = (await db.accounts.toArray())[0];
  expect(account.balance).toBe(1234.56);
  expect(account.openingBalance).toBe(1234.56 + 10 - 2000);
  expect(await db.categories.where('type').equals('expense').count()).toBeGreaterThan(0);
  expect((await db.recurringItems.toArray()).map((i) => i.logo)).toEqual(['disneyplus', 'amazon']);
});
