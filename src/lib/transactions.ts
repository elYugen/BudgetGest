import { db } from '../db/db';
import type { Transaction } from '../db/types';
import { TRANSFER_CATEGORY } from '../db/types';

// Signed effect of a transaction on its account balance.
const signed = (t: Pick<Transaction, 'type' | 'amount'>) => (t.type === 'income' ? t.amount : -t.amount);

// Must run inside a Dexie transaction that includes db.accounts.
async function adjustBalance(accountId: number | undefined, delta: number) {
  if (!accountId || !delta) return;
  const acc = await db.accounts.get(accountId);
  if (acc) await db.accounts.update(accountId, { balance: acc.balance + delta });
}

export const isTransfer = (t: Transaction) => !!t.transferId;

// Income/expense totals ignore transfers, which only move money between the user's own accounts.
export const realTransactions = (txs: Transaction[]) => txs.filter((t) => !t.transferId);

export async function addTransaction(tx: Omit<Transaction, 'id'>) {
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    await db.transactions.add(tx);
    await adjustBalance(tx.accountId, signed(tx));
  });
}

export async function updateTransaction(id: number, next: Omit<Transaction, 'id'>) {
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    const prev = await db.transactions.get(id);
    if (!prev) return;
    await adjustBalance(prev.accountId, -signed(prev));
    await db.transactions.put({ ...prev, ...next, id });
    await adjustBalance(next.accountId, signed(next));
  });
}

// Deleting either leg of a transfer removes both legs.
export async function deleteTransaction(id: number) {
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    const tx = await db.transactions.get(id);
    if (!tx) return;
    const legs = tx.transferId ? await db.transactions.where('transferId').equals(tx.transferId).toArray() : [tx];
    for (const leg of legs) {
      await db.transactions.delete(leg.id!);
      await adjustBalance(leg.accountId, -signed(leg));
    }
  });
}

export async function addTransfer({
  fromAccountId,
  toAccountId,
  amount,
  date,
  label,
}: {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  date: string;
  label: string;
}) {
  const transferId = crypto.randomUUID();
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    const base = { amount, date, label, category: TRANSFER_CATEGORY, transferId };
    await db.transactions.add({ ...base, type: 'expense', accountId: fromAccountId });
    await db.transactions.add({ ...base, type: 'income', accountId: toAccountId });
    await adjustBalance(fromAccountId, -amount);
    await adjustBalance(toAccountId, amount);
  });
}
