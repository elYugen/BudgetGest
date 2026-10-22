import type { Account, Budget, Goal, RecurringItem, Security, Transaction } from '../db/types';
import { accountValue } from './accountValue';
import { formatMoney } from './format';
import { expensesByCategory, monthTotals, periodOf, remainingToLive } from './stats';

export type AdviceLevel = 'critical' | 'warning' | 'info' | 'good';

export interface Advice {
  id: string;
  level: AdviceLevel;
  title: string;
  detail: string;
}

export interface AdviceInput {
  accounts: Account[];
  securities: Security[];
  transactions: Transaction[];
  recurringItems: RecurringItem[];
  budgets: Budget[];
  goals: Goal[];
  now?: Date;
}

const LEVEL_ORDER: Record<AdviceLevel, number> = { critical: 0, warning: 1, info: 2, good: 3 };

// Average monthly spending over the last `months` complete months that have any
// spending. Falls back to active recurring charges when there is no history yet.
export function averageMonthlyExpense(transactions: Transaction[], recurringItems: RecurringItem[], now: Date, months = 3): number {
  const totals: number[] = [];
  for (let i = 1; i <= months; i++) {
    const { expense } = monthTotals(transactions, periodOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    if (expense > 0) totals.push(expense);
  }
  if (totals.length > 0) return totals.reduce((s, v) => s + v, 0) / totals.length;
  return recurringItems.filter((i) => i.active && i.kind !== 'income').reduce((s, i) => s + i.amount, 0);
}

const monthsBetween = (from: Date, to: Date) =>
  (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

// Rule-based, fully local tips derived from the user's own figures. Indicative only.
export function computeAdvice({ accounts, securities, transactions, recurringItems, budgets, goals, now = new Date() }: AdviceInput): Advice[] {
  const tips: Advice[] = [];
  if (accounts.length === 0) return tips;

  const current = accounts.filter((a) => a.type === 'courant');
  const savings = accounts.filter((a) => a.type === 'livret');
  const investAccounts = accounts.filter((a) => a.type === 'pea' || a.type === 'compte-titre');
  const currentTotal = current.reduce((s, a) => s + a.balance, 0);
  const savingsTotal = savings.reduce((s, a) => s + a.balance, 0);
  const investedTotal = investAccounts.reduce((s, a) => s + accountValue(a, securities), 0);
  const liquid = currentTotal + savingsTotal;
  const netWorth = liquid + investedTotal;
  const monthlyExpense = averageMonthlyExpense(transactions, recurringItems, now);

  // 1. Overdraft.
  for (const a of current.filter((acc) => acc.balance < 0)) {
    tips.push({
      id: `overdraft-${a.id}`,
      level: 'critical',
      title: `${a.name} est à découvert`,
      detail: `Solde de ${formatMoney(a.balance)}. Un virement depuis votre épargne évite les agios, souvent bien plus chers que ce que rapporte un livret.`,
    });
  }

  // 2. End of month projection.
  const remaining = remainingToLive(transactions, recurringItems, now);
  if (remaining.total < 0) {
    tips.push({
      id: 'remaining-negative',
      level: 'critical',
      title: 'Ce mois-ci risque de finir dans le rouge',
      detail: `En comptant les charges encore à venir, il manque ${formatMoney(-remaining.total)}. Repérez les dépenses non essentielles à décaler.`,
    });
  }

  // 3. Emergency fund: 3 to 6 months of spending kept liquid.
  if (monthlyExpense > 0) {
    const coverage = liquid / monthlyExpense;
    if (coverage < 3) {
      tips.push({
        id: 'emergency-fund-low',
        level: 'warning',
        title: 'Épargne de précaution insuffisante',
        detail: `Vos liquidités couvrent ${coverage.toFixed(1).replace('.', ',')} mois de dépenses. Visez 3 à 6 mois (${formatMoney(monthlyExpense * 3)} à ${formatMoney(monthlyExpense * 6)}) avant d'investir.`,
      });
    } else if (coverage > 12 && investedTotal < liquid * 0.25) {
      tips.push({
        id: 'emergency-fund-high',
        level: 'info',
        title: 'Beaucoup d\'argent qui dort',
        detail: `Vos liquidités couvrent ${Math.round(coverage)} mois de dépenses. Au-delà de 6 mois, une partie pourrait être placée sur le long terme (PEA, assurance-vie…) pour viser un meilleur rendement.`,
      });
    } else {
      tips.push({
        id: 'emergency-fund-ok',
        level: 'good',
        title: 'Épargne de précaution solide',
        detail: `Vos liquidités couvrent ${Math.round(coverage)} mois de dépenses : vous êtes paré pour un imprévu.`,
      });
    }

    // 4. Money idle on current accounts while a savings account exists.
    const idle = currentTotal - monthlyExpense * 1.5;
    if (savings.length > 0 && idle > 500) {
      tips.push({
        id: 'idle-current',
        level: 'info',
        title: 'Votre compte courant est bien rempli',
        detail: `Environ ${formatMoney(idle)} dépassent un mois et demi de dépenses. Sur un livret, cet argent resterait disponible tout en rapportant des intérêts.`,
      });
    }
  }

  // 5. Savings rate of the last complete month.
  const last = monthTotals(transactions, periodOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  if (last.income > 0) {
    const rate = ((last.income - last.expense) / last.income) * 100;
    if (rate < 0) {
      tips.push({
        id: 'savings-rate-negative',
        level: 'warning',
        title: 'Vous avez dépensé plus que gagné le mois dernier',
        detail: `${formatMoney(last.expense - last.income)} de plus que vos revenus. Si cela se répète, votre épargne fond.`,
      });
    } else if (rate < 10) {
      tips.push({
        id: 'savings-rate-low',
        level: 'warning',
        title: `Taux d'épargne de ${rate.toFixed(0)} % le mois dernier`,
        detail: 'Viser au moins 10 à 20 % de vos revenus. Un virement automatique vers un livret en début de mois aide beaucoup.',
      });
    } else if (rate >= 20) {
      tips.push({
        id: 'savings-rate-good',
        level: 'good',
        title: `Bravo, ${rate.toFixed(0)} % de vos revenus épargnés le mois dernier`,
        detail: 'Au-dessus des 20 % souvent recommandés. Continuez ainsi !',
      });
    }
  }

  // 6. Budgets over the limit this month.
  const spent = expensesByCategory(transactions, periodOf(now));
  for (const b of budgets) {
    const amount = spent.find((s) => s.category === b.category)?.amount ?? 0;
    if (amount > b.amount) {
      tips.push({
        id: `budget-${b.category}`,
        level: 'warning',
        title: `Budget « ${b.category} » dépassé`,
        detail: `${formatMoney(amount)} dépensés pour ${formatMoney(b.amount)} prévus (+${formatMoney(amount - b.amount)}).`,
      });
    }
  }

  // 7. Subscriptions weight.
  const subs = recurringItems.filter((i) => i.active && i.kind === 'subscription');
  const subsTotal = subs.reduce((s, i) => s + i.amount, 0);
  const monthlyIncome = recurringItems.filter((i) => i.active && i.kind === 'income').reduce((s, i) => s + i.amount, 0) || last.income;
  if (subs.length >= 3 && monthlyIncome > 0 && subsTotal / monthlyIncome > 0.05) {
    tips.push({
      id: 'subscriptions',
      level: 'info',
      title: `${subs.length} abonnements pour ${formatMoney(subsTotal)}/mois`,
      detail: `Soit ${formatMoney(subsTotal * 12)} par an (${((subsTotal / monthlyIncome) * 100).toFixed(0)} % de vos revenus). Faites le tri dans ceux que vous utilisez peu.`,
    });
  }

  // 8. Concentration of the securities portfolio.
  const portfolio = securities.reduce((s, sec) => s + sec.quantity * sec.currentPrice, 0);
  if (portfolio > 0 && securities.length > 0) {
    const biggest = securities.reduce((a, b) => (a.quantity * a.currentPrice >= b.quantity * b.currentPrice ? a : b));
    const share = (biggest.quantity * biggest.currentPrice) / portfolio;
    if (securities.length === 1 || share > 0.5) {
      tips.push({
        id: 'concentration',
        level: 'info',
        title: 'Portefeuille peu diversifié',
        detail: `${biggest.name} représente ${Math.round(share * 100)} % de vos titres. Un ETF large (monde, S&P 500…) répartit le risque sur des centaines d'entreprises.`,
      });
    }
  }

  // 9. No long-term investment at all despite a comfortable safety net.
  if (investAccounts.length === 0 && monthlyExpense > 0 && liquid > monthlyExpense * 6) {
    tips.push({
      id: 'no-investment',
      level: 'info',
      title: 'Pensez à investir sur le long terme',
      detail: "Votre épargne de précaution est constituée. Un PEA permet d'investir en actions avec une fiscalité allégée après 5 ans.",
    });
  }

  // 10. Goals with a deadline: monthly effort needed.
  for (const g of goals) {
    if (g.recurring || g.achieved || !g.deadline) continue;
    const account = accounts.find((a) => a.id === g.accountId);
    const have = account ? accountValue(account, securities) : 0;
    const missing = g.targetAmount - have;
    if (missing <= 0) continue;
    const monthsLeft = monthsBetween(now, new Date(g.deadline));
    if (monthsLeft <= 0) {
      tips.push({
        id: `goal-${g.id}`,
        level: 'warning',
        title: `Objectif « ${g.label} » : échéance atteinte`,
        detail: `Il manque encore ${formatMoney(missing)}. Repoussez l'échéance ou ajustez le montant.`,
      });
    } else {
      tips.push({
        id: `goal-${g.id}`,
        level: 'info',
        title: `Objectif « ${g.label} »`,
        detail: `Mettez de côté environ ${formatMoney(missing / monthsLeft)} par mois pour atteindre ${formatMoney(g.targetAmount)} à temps (${monthsLeft} mois restants).`,
      });
    }
  }

  if (netWorth > 0 && tips.length === 0) {
    tips.push({
      id: 'all-good',
      level: 'good',
      title: 'Tout semble en ordre',
      detail: 'Aucun point d\'attention détecté sur vos comptes pour le moment.',
    });
  }

  return tips.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
