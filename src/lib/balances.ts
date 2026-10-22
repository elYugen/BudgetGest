import { db } from '../db/db';
import type { Account, Transaction } from '../db/types';

const round = (v: number) => Math.round(v * 100) / 100;

// Net effect of all transactions on one account.
export function transactionsTotal(transactions: Transaction[], accountId: number): number {
  return round(
    transactions
      .filter((t) => t.accountId === accountId)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0),
  );
}

// The balance an account should have: its opening balance plus every transaction recorded on it.
export const expectedBalance = (account: Account, transactions: Transaction[]) =>
  round((account.openingBalance ?? 0) + transactionsTotal(transactions, account.id!));

// Derives the opening balance from the current (trusted) balance, for accounts created
// before opening balances existed or restored from an older backup.
export async function ensureOpeningBalances() {
  const transactions = await db.transactions.toArray();
  await db.accounts.toCollection().modify((a: Account) => {
    if (a.openingBalance === undefined) a.openingBalance = round(a.balance - transactionsTotal(transactions, a.id!));
  });
}

// Opening balance to store when the user types the account's current balance by hand.
export async function openingBalanceFor(accountId: number | undefined, currentBalance: number): Promise<number> {
  if (!accountId) return currentBalance;
  const transactions = await db.transactions.where('accountId').equals(accountId).toArray();
  return round(currentBalance - transactionsTotal(transactions, accountId));
}

export interface BalanceMismatch {
  account: Account;
  expected: number;
}

export async function findBalanceMismatches(): Promise<BalanceMismatch[]> {
  const [accounts, transactions] = await Promise.all([db.accounts.toArray(), db.transactions.toArray()]);
  return accounts
    .map((account) => ({ account, expected: expectedBalance(account, transactions) }))
    .filter(({ account, expected }) => Math.abs(account.balance - expected) >= 0.01);
}

// Rewrites every drifted balance from the transaction history. Returns what was fixed.
export async function recalculateBalances(): Promise<BalanceMismatch[]> {
  return db.transaction('rw', db.accounts, db.transactions, async () => {
    const mismatches = await findBalanceMismatches();
    for (const { account, expected } of mismatches) await db.accounts.update(account.id!, { balance: expected });
    return mismatches;
  });
}
