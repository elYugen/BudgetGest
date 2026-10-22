import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/db';
import { addTransaction, addTransfer, deleteTransaction, updateTransaction } from '../transactions';
import { monthTotals } from '../stats';

const balance = async (id: number) => (await db.accounts.get(id))?.balance;
const account = async (name: string, balance: number) =>
  (await db.accounts.add({ name, type: 'courant', balance, color: '#000', icon: 'wallet', createdAt: '' }))!;

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('transactions', () => {
  it('keeps the balance in sync on add, update and delete', async () => {
    const a = await account('A', 100);
    const b = await account('B', 0);
    await addTransaction({ accountId: a, date: '2026-10-01', amount: 30, type: 'expense', category: 'Autre', label: 'x' });
    expect(await balance(a)).toBe(70);

    const id = (await db.transactions.toArray())[0].id!;
    // Change amount, type and account at once: A gets its 30 back, B receives 50.
    await updateTransaction(id, { accountId: b, date: '2026-10-01', amount: 50, type: 'income', category: 'Autre', label: 'x' });
    expect(await balance(a)).toBe(100);
    expect(await balance(b)).toBe(50);

    await deleteTransaction(id);
    expect(await balance(b)).toBe(0);
  });

  it('moves money with a transfer, excluded from monthly totals, and deletes both legs', async () => {
    const a = await account('A', 1000);
    const b = await account('B', 0);
    await addTransfer({ fromAccountId: a, toAccountId: b, amount: 200, date: '2026-10-05', label: 'Épargne' });
    expect(await balance(a)).toBe(800);
    expect(await balance(b)).toBe(200);
    expect(monthTotals(await db.transactions.toArray(), '2026-10')).toEqual({ income: 0, expense: 0 });

    const leg = (await db.transactions.toArray())[1];
    await deleteTransaction(leg.id!);
    expect(await db.transactions.count()).toBe(0);
    expect(await balance(a)).toBe(1000);
    expect(await balance(b)).toBe(0);
  });
});
