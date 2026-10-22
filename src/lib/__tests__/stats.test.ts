import { describe, expect, it } from 'vitest';
import type { Account, RecurringItem, Transaction } from '../../db/types';
import { daysUntilNext, remainingToLive } from '../stats';
import { computeAdvice } from '../advice';

const item = (over: Partial<RecurringItem>): RecurringItem => ({
  id: 1, kind: 'expense', label: 'x', amount: 100, dayOfMonth: 1, category: 'Autre', color: '#000', emoji: '', active: true, ...over,
});
const tx = (over: Partial<Transaction>): Transaction => ({
  date: '2026-10-01', amount: 100, type: 'expense', category: 'Autre', label: 'x', ...over,
});
const acc = (over: Partial<Account>): Account => ({
  id: 1, name: 'Courant', type: 'courant', balance: 0, color: '#000', icon: 'wallet', createdAt: '', ...over,
});

describe('daysUntilNext', () => {
  it('clamps the 31st to the end of short months', () => {
    expect(daysUntilNext(31, new Date(2026, 1, 20))).toBe(8); // 28 Feb
    expect(daysUntilNext(31, new Date(2026, 3, 30))).toBe(0); // 30 Apr is today
    expect(daysUntilNext(5, new Date(2026, 9, 10))).toBe(26); // 5 Nov
  });
});

describe('remainingToLive', () => {
  it('adds upcoming recurring items not yet recorded this month', () => {
    const now = new Date(2026, 9, 10);
    const r = remainingToLive(
      [tx({ type: 'income', amount: 2000, recurringItemId: 1, date: '2026-10-01' }), tx({ amount: 300, date: '2026-10-05' })],
      [item({ id: 1, kind: 'income', amount: 2000, dayOfMonth: 1 }), item({ id: 2, amount: 800, dayOfMonth: 15 })],
      now,
    );
    expect(r.total).toBe(2000 - 300 - 800);
    expect(r.upcomingExpense).toBe(800);
  });
});

describe('computeAdvice', () => {
  const base = { securities: [], recurringItems: [], budgets: [], goals: [], now: new Date(2026, 9, 10) };
  const history = [tx({ date: '2026-09-10', amount: 1000 }), tx({ date: '2026-08-10', amount: 1000 }), tx({ date: '2026-07-10', amount: 1000 })];

  it('flags an overdraft first', () => {
    const advice = computeAdvice({ ...base, accounts: [acc({ balance: -50 })], transactions: history });
    expect(advice[0].level).toBe('critical');
    expect(advice[0].id).toBe('overdraft-1');
  });

  it('warns about a thin emergency fund', () => {
    const advice = computeAdvice({ ...base, accounts: [acc({ balance: 1500 })], transactions: history });
    expect(advice.map((a) => a.id)).toContain('emergency-fund-low');
  });

  it('suggests investing idle money', () => {
    const advice = computeAdvice({ ...base, accounts: [acc({ balance: 20000 })], transactions: history });
    expect(advice.map((a) => a.id)).toEqual(expect.arrayContaining(['emergency-fund-high', 'no-investment']));
  });
});
