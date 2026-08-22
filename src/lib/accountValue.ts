import type { Account, Security } from '../db/types';

// Cash balance for banking accounts; balance + held securities' market value for
// brokerage-style accounts (compte-titres, PEA).
export function accountValue(account: Account, securities: Security[]): number {
  if (account.type === 'compte-titre' || account.type === 'pea') {
    const securitiesValue = securities
      .filter((s) => s.accountId === account.id)
      .reduce((sum, s) => sum + s.quantity * s.currentPrice, 0);
    return account.balance + securitiesValue;
  }
  return account.balance;
}
