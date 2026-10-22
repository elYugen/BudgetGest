import type { RecurringItem, Transaction } from '../db/types';
import { clampDayOfMonth } from './format';
import { realTransactions } from './transactions';

export const periodOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const previousPeriod = (now: Date = new Date()) => periodOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));

export function monthTotals(transactions: Transaction[], period: string) {
  const txs = realTransactions(transactions).filter((t) => t.date.startsWith(period));
  return {
    income: txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expense: txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  };
}

export function expensesByCategory(transactions: Transaction[], period: string): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const t of realTransactions(transactions)) {
    if (t.type !== 'expense' || !t.date.startsWith(period)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return Array.from(map, ([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

// Percentage change from `previous` to `current`, or null when there is nothing to compare against.
export const percentChange = (current: number, previous: number): number | null =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

// What should remain at the end of the month: income and expenses already recorded,
// plus recurring items still to come this month (not yet turned into a transaction).
export function remainingToLive(transactions: Transaction[], items: RecurringItem[], now: Date = new Date()) {
  const period = periodOf(now);
  const { income, expense } = monthTotals(transactions, period);
  let upcomingIncome = 0;
  let upcomingExpense = 0;
  for (const item of items) {
    if (!item.active) continue;
    const done = transactions.some((t) => t.recurringItemId === item.id && t.date.startsWith(period));
    if (done) continue;
    const day = clampDayOfMonth(item.dayOfMonth, now.getFullYear(), now.getMonth());
    if (day < now.getDate()) continue;
    if (item.kind === 'income') upcomingIncome += item.amount;
    else upcomingExpense += item.amount;
  }
  return {
    upcomingIncome,
    upcomingExpense,
    total: income + upcomingIncome - expense - upcomingExpense,
  };
}

// Days until the next occurrence of a recurring item, respecting short months
// (an item on the 31st falls on the 30th, or the 28th/29th in February).
export function daysUntilNext(dayOfMonth: number, now: Date = new Date()): number {
  const today = now.getDate();
  const thisMonth = clampDayOfMonth(dayOfMonth, now.getFullYear(), now.getMonth());
  if (thisMonth >= today) return thisMonth - today;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const nextMonth = clampDayOfMonth(dayOfMonth, now.getFullYear(), now.getMonth() + 1);
  return daysInMonth - today + nextMonth;
}
