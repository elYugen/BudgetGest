import Dexie, { type EntityTable } from 'dexie';
import type { Account, Security, Transaction, RecurringItem, Goal, Category, Budget, Snapshot, Meta } from './types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  ...EXPENSE_CATEGORIES.map((name) => ({ name, type: 'expense' as const })),
  ...INCOME_CATEGORIES.map((name) => ({ name, type: 'income' as const })),
];

class BudgetDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  securities!: EntityTable<Security, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  recurringItems!: EntityTable<RecurringItem, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  snapshots!: EntityTable<Snapshot, 'period'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor() {
    super('budgetDB');
    this.version(1).stores({
      accounts: '++id, type',
      securities: '++id, accountId',
      transactions: '++id, accountId, date, type, recurringItemId',
      recurringItems: '++id, kind, dayOfMonth',
    });
    this.version(2).stores({
      goals: '++id, accountId',
    });
    this.version(3)
      .stores({
        transactions: '++id, accountId, date, type, recurringItemId, transferId',
        categories: '++id, type, [type+name]',
        budgets: '++id, &category',
        snapshots: '&period',
        meta: '&key',
      })
      .upgrade(async (tx) => {
        await tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
        // Subscriptions created before these brand logos existed.
        await tx
          .table('recurringItems')
          .toCollection()
          .modify((item: RecurringItem) => {
            if (item.logo || item.kind !== 'subscription') return;
            if (/disney/i.test(item.label)) item.logo = 'disneyplus';
            else if (/amazon|prime/i.test(item.label)) item.logo = 'amazon';
          });
      });

    // Opening balance = current balance minus every recorded transaction, so that
    // existing balances are unchanged (same formula as lib/balances.ts).
    this.version(4).upgrade(async (tx) => {
      const transactions: Transaction[] = await tx.table('transactions').toArray();
      await tx
        .table('accounts')
        .toCollection()
        .modify((a: Account) => {
          const total = transactions
            .filter((t) => t.accountId === a.id)
            .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
          a.openingBalance = Math.round((a.balance - total) * 100) / 100;
        });
    });

    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
    });
  }
}

export const db = new BudgetDB();
