export type AccountType = 'courant' | 'livret' | 'compte-titre' | 'pea';

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  balance: number;
  // Balance before the first recorded transaction: balance should always equal
  // openingBalance + the sum of the account's transactions (see lib/balances.ts).
  openingBalance?: number;
  color: string;
  icon: string;
  createdAt: string;
}

export interface Security {
  id?: number;
  accountId: number;
  name: string;
  ticker: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  priceUpdatedAt?: string;
  // onvista instrument reference ("STOCK/85653") used to fetch quotes, see lib/quotes.ts.
  quoteId?: string;
}

export type TxType = 'income' | 'expense';

export interface Transaction {
  id?: number;
  accountId?: number;
  date: string;
  amount: number;
  type: TxType;
  category: string;
  label: string;
  recurringItemId?: number;
  // Shared by the two legs (expense on the source, income on the destination) of a
  // transfer between accounts. Transfers are excluded from income/expense statistics.
  transferId?: string;
}

export interface Category {
  id?: number;
  name: string;
  type: TxType;
}

export interface Budget {
  id?: number;
  category: string;
  amount: number;
}

// Net worth recorded once per month (the latest value of the month wins).
export interface Snapshot {
  period: string;
  netWorth: number;
}

export interface Meta {
  key: string;
  value: string;
}

export interface Goal {
  id?: number;
  label: string;
  targetAmount: number;
  accountId: number;
  emoji: string;
  color: string;
  deadline?: string;
  recurring: boolean;
  achieved: boolean;
  completedPeriods: string[];
  createdAt: string;
}

export type RecurringKind = 'income' | 'expense' | 'subscription';

export interface RecurringItem {
  id?: number;
  kind: RecurringKind;
  label: string;
  amount: number;
  dayOfMonth: number;
  category: string;
  color: string;
  emoji: string;
  logo?: string;
  accountId?: number;
  active: boolean;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  courant: 'Compte courant',
  livret: 'Livret',
  'compte-titre': 'Compte-titres',
  pea: 'PEA',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  courant: 'wallet',
  livret: 'piggy-bank',
  'compte-titre': 'line-chart',
  pea: 'pie-chart',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  courant: '#16A34A',
  livret: '#0EA5E9',
  'compte-titre': '#8B5CF6',
  pea: '#F59E0B',
};

export const EXPENSE_CATEGORIES = [
  'Alimentation',
  'Logement',
  'Transport',
  'Santé',
  'Loisirs',
  'Shopping',
  'Restaurant',
  'Factures',
  'Épargne',
  'Autre',
];

export const INCOME_CATEGORIES = [
  'Salaire',
  'Freelance',
  'Remboursement',
  'Cadeau',
  'Placement',
  'Autre',
];

export const TRANSFER_CATEGORY = 'Virement';
