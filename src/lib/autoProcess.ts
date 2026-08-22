import { db } from '../db/db';
import { clampDayOfMonth, currentPeriod } from './format';

// Automatically turns due recurring items (salary, fixed charges, subscriptions) into
// real transactions and applies them to the linked account's balance, once their day
// of the current month has arrived. Safe to call repeatedly: already-processed items
// (one transaction per item per month) are skipped.
export async function processRecurringItems(): Promise<number> {
  const now = new Date();
  const today = now.getDate();
  const period = currentPeriod();
  const items = await db.recurringItems.toArray();
  let processed = 0;

  for (const item of items) {
    if (!item.active || !item.id) continue;
    const day = clampDayOfMonth(item.dayOfMonth, now.getFullYear(), now.getMonth());
    if (day > today) continue;

    const alreadyDone = await db.transactions.where('recurringItemId').equals(item.id).toArray();
    if (alreadyDone.some((t) => t.date.startsWith(period))) continue;

    const date = `${period}-${String(day).padStart(2, '0')}`;
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      await db.transactions.add({
        ...(item.accountId ? { accountId: item.accountId } : {}),
        date,
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
    });
    processed++;
  }

  return processed;
}
