import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/db';
import type { AccountType, TxType } from '../../db/types';
import { addTransaction, addTransfer, deleteTransaction, updateTransaction } from '../transactions';
import { processRecurringItems } from '../autoProcess';
import { findBalanceMismatches, openingBalanceFor, recalculateBalances } from '../balances';

// Small deterministic PRNG (mulberry32) so a failing run can be replayed.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LABELS = ['Courses', 'Essence', 'Resto', 'Pharmacie', 'Cinéma', 'Amazon', 'Remboursement', 'Vinted', 'Boulangerie'];
const CATEGORIES = ['Alimentation', 'Transport', 'Restaurant', 'Santé', 'Loisirs', 'Shopping', 'Autre'];

// Fills the database with a realistic mix of accounts, recurring items and a long,
// messy history of user actions, all going through the app's own helpers.
async function seedFakeData(seed: number, operations: number) {
  const r = rng(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const money = (max: number) => Math.round(r() * max * 100) / 100 + 0.01;
  const date = (month: number) => `2026-${String(month).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;

  const accountDefs: [string, AccountType, number][] = [
    ['Compte courant', 'courant', 1523.42],
    ['Compte joint', 'courant', -87.1],
    ['Livret A', 'livret', 8200],
    ['LDDS', 'livret', 3150.5],
    ['PEA', 'pea', 412.07],
  ];
  const accountIds: number[] = [];
  for (const [name, type, balance] of accountDefs) {
    const id = await db.accounts.add({ name, type, balance, openingBalance: balance, color: '#000', icon: 'wallet', createdAt: '' });
    accountIds.push(id!);
  }

  const recurring = [
    { kind: 'income' as const, label: 'Salaire', amount: 2345.67, dayOfMonth: 28, category: 'Salaire' },
    { kind: 'expense' as const, label: 'Loyer', amount: 780, dayOfMonth: 5, category: 'Logement' },
    { kind: 'expense' as const, label: 'Assurance', amount: 42.9, dayOfMonth: 31, category: 'Factures' },
    { kind: 'subscription' as const, label: 'Netflix', amount: 13.49, dayOfMonth: 15, category: 'Streaming' },
    { kind: 'subscription' as const, label: 'Sans compte', amount: 9.99, dayOfMonth: 10, category: 'Streaming', noAccount: true },
  ];
  const recurringIds: number[] = [];
  for (const { noAccount, ...item } of recurring.map((i) => ({ noAccount: false, ...i }))) {
    const id = await db.recurringItems.add({ ...item, color: '#000', emoji: '•', active: true, accountId: noAccount ? undefined : accountIds[0] });
    recurringIds.push(id!);
  }

  await processRecurringItems(new Date(2026, 0, 3));
  for (let i = 0; i < operations; i++) {
    const month = 1 + Math.floor((i / operations) * 9);
    const roll = r();
    const existing = await db.transactions.toArray();

    if (roll < 0.45) {
      await addTransaction({
        accountId: pick(accountIds),
        date: date(month),
        amount: money(250),
        type: (r() < 0.75 ? 'expense' : 'income') as TxType,
        category: pick(CATEGORIES),
        label: pick(LABELS),
      });
    } else if (roll < 0.6 && existing.length) {
      const t = pick(existing.filter((x) => !x.transferId).length ? existing.filter((x) => !x.transferId) : existing);
      if (t.transferId) continue;
      // Edit amount, type and sometimes the account, like the edit sheet does.
      await updateTransaction(t.id!, {
        ...t,
        amount: money(400),
        type: r() < 0.5 ? 'expense' : 'income',
        accountId: r() < 0.3 ? pick(accountIds) : t.accountId,
      });
    } else if (roll < 0.72 && existing.length) {
      await deleteTransaction(pick(existing).id!);
    } else if (roll < 0.84) {
      const from = pick(accountIds);
      const to = pick(accountIds.filter((id) => id !== from));
      await addTransfer({ fromAccountId: from, toAccountId: to, amount: money(500), date: date(month), label: 'Virement' });
    } else if (roll < 0.9) {
      await processRecurringItems(new Date(2026, month - 1, 1 + Math.floor(r() * 28), 12));
    } else if (roll < 0.95) {
      // "Marquer comme fait" toggled on the recurring page.
      const itemId = pick(recurringIds);
      const done = existing.find((t) => t.recurringItemId === itemId && t.date.startsWith(`2026-${String(month).padStart(2, '0')}`));
      if (done) await deleteTransaction(done.id!);
      else {
        const item = (await db.recurringItems.get(itemId))!;
        await addTransaction({
          ...(item.accountId ? { accountId: item.accountId } : {}),
          date: date(month),
          amount: item.amount,
          type: item.kind === 'income' ? 'income' : 'expense',
          category: item.category,
          label: item.label,
          recurringItemId: itemId,
        });
      }
    } else {
      // Balance typed by hand in the account form.
      const id = pick(accountIds);
      const balance = money(5000) - 1000;
      await db.accounts.update(id, { balance, openingBalance: await openingBalanceFor(id, balance) });
    }
  }
  return accountIds;
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('balances on a large fake dataset', () => {
  for (const seed of [1, 42, 2026]) {
    it(`stay equal to opening balance + history after hundreds of operations (seed ${seed})`, async () => {
      await seedFakeData(seed, 400);
      expect(await db.transactions.count()).toBeGreaterThan(100);
      expect(await findBalanceMismatches()).toEqual([]);
    });
  }

  it('detects and repairs corrupted balances, leaving correct ones untouched', async () => {
    const accountIds = await seedFakeData(7, 250);
    const before = await db.accounts.toArray();
    await db.accounts.update(accountIds[0], { balance: before[0].balance + 123.45 });
    await db.accounts.update(accountIds[3], { balance: 0 });

    const mismatches = await findBalanceMismatches();
    expect(mismatches.map((m) => m.account.id).sort()).toEqual([accountIds[0], accountIds[3]].sort());
    expect(mismatches.find((m) => m.account.id === accountIds[0])?.expected).toBeCloseTo(before[0].balance, 2);

    const fixed = await recalculateBalances();
    expect(fixed).toHaveLength(2);
    expect(await findBalanceMismatches()).toEqual([]);
    const after = await db.accounts.toArray();
    after.forEach((a, i) => expect(a.balance).toBeCloseTo(before[i].balance, 2));
  });
});
