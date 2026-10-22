import { db } from '../db/db';
import { accountValue } from './accountValue';
import { currentPeriod } from './format';

export async function computeNetWorth(): Promise<number> {
  const [accounts, securities] = await Promise.all([db.accounts.toArray(), db.securities.toArray()]);
  return accounts.reduce((sum, a) => sum + accountValue(a, securities), 0);
}

// Keeps one net-worth value per month: the current month's entry is overwritten until
// the month ends, which builds the history shown on the dashboard.
export async function recordSnapshot(netWorth: number) {
  await db.snapshots.put({ period: currentPeriod(), netWorth: Math.round(netWorth * 100) / 100 });
}
