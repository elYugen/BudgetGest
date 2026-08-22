export type AccountType = 'courant' | 'livret' | 'compte-titre' | 'pea';

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  balance: number;
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
}

export interface Goal {
  id?: number;
  label: string;
  targetAmount: number;
  accountId: number;
  emoji: string;
  color: string;
  deadline?: string;
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
  courant: '💳',
  livret: '🐷',
  'compte-titre': '📈',
  pea: '📊',
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
