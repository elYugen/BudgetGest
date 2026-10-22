import { db } from '../db/db';
import { clampDayOfMonth } from './format';

const LAST_RUN_KEY = 'recurring.lastRun';

const toPeriod = (year: number, monthIndex: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
const toISODate = (d: Date) => `${toPeriod(d.getFullYear(), d.getMonth())}-${String(d.getDate()).padStart(2, '0')}`;

// Months from the one containing `from` up to the one containing `to`, inclusive.
function monthsBetween(from: Date, to: Date): { year: number; monthIndex: number }[] {
  const months = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor.getFullYear() < to.getFullYear() || (cursor.getFullYear() === to.getFullYear() && cursor.getMonth() <= to.getMonth())) {
    months.push({ year: cursor.getFullYear(), monthIndex: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

let running: Promise<number> | null = null;

// Automatically turns due recurring items (salary, fixed charges, subscriptions) into
// real transactions and applies them to the linked account's balance, once their day
// of the month has arrived. Months elapsed since the last run (app not opened) are
// caught up. Safe to call repeatedly and concurrently: everything runs in a single
// read-write transaction and already-processed items (one transaction per item per
// month) are skipped.
export function processRecurringItems(now: Date = new Date()): Promise<number> {
  if (!running) {
    running = run(now).finally(() => {
      running = null;
    });
  }
  return running;
}

async function run(now: Date): Promise<number> {
  return db.transaction('rw', [db.transactions, db.accounts, db.recurringItems, db.meta], async () => {
    const lastRunRaw = (await db.meta.get(LAST_RUN_KEY))?.value;
    const lastRun = lastRunRaw ? new Date(lastRunRaw) : now;
    const from = lastRun < now ? lastRun : now;
    const months = monthsBetween(from, now);
    const items = (await db.recurringItems.toArray()).filter((i) => i.active && i.id);
    let processed = 0;

    for (const item of items) {
      const done = await db.transactions.where('recurringItemId').equals(item.id!).toArray();
      for (const { year, monthIndex } of months) {
        const day = clampDayOfMonth(item.dayOfMonth, year, monthIndex);
        const due = new Date(year, monthIndex, day);
        if (due > now) continue;
        const period = toPeriod(year, monthIndex);
        if (done.some((t) => t.date.startsWith(period))) continue;

        await db.transactions.add({
          ...(item.accountId ? { accountId: item.accountId } : {}),
          date: toISODate(due),
          amount: item.amount,
          type: item.kind === 'income' ? 'income' : 'expense',
          category: item.category,
          label: item.label,
          recurringItemId: item.id,
        });
        if (item.accountId) {
          const acc = await db.accounts.get(item.accountId);
          if (acc) {
            await db.accounts.update(acc.id!, {
              balance: acc.balance + (item.kind === 'income' ? item.amount : -item.amount),
            });
          }
        }
        processed++;
      }
    }

    await db.meta.put({ key: LAST_RUN_KEY, value: now.toISOString() });
    return processed;
  });
}
