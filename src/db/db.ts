import Dexie, { type EntityTable } from 'dexie';
import type { Account, Security, Transaction, RecurringItem, Goal } from './types';

class BudgetDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  securities!: EntityTable<Security, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  recurringItems!: EntityTable<RecurringItem, 'id'>;
  goals!: EntityTable<Goal, 'id'>;

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
  }
}

export const db = new BudgetDB();
