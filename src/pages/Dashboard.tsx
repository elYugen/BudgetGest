import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Wallet, Sparkles, Target, TrendingUp, PiggyBank, ChartBar } from 'lucide-react';
import { db } from '../db/db';
import type { Account, Goal } from '../db/types';
import { BentoCard, CardLabel } from '../components/ui/BentoCard';
import { IconBadge } from '../components/ui/IconBadge';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Form';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { GoalRow } from '../components/goals/GoalRow';
import { formatMoney, formatMoneyShort, currentPeriod, formatDateShort, periodLabel } from '../lib/format';
import { monthTotals, previousPeriod, percentChange, remainingToLive, expensesByCategory, daysUntilNext } from '../lib/stats';
import { realTransactions } from '../lib/transactions';
import { computeAdvice } from '../lib/advice';
import { AdviceCard } from '../components/advice/AdviceCard';
import { accountValue } from '../lib/accountValue';
import { resolveAccountIcon } from '../lib/accountIcons';

const BUCKET_COLORS = { bank: '#16A34A', cash: '#0EA5E9', securities: '#8B5CF6' };

export function Dashboard() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const securities = useLiveQuery(() => db.securities.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? [];
  const allRecurringItems = useLiveQuery(() => db.recurringItems.toArray(), []) ?? [];
  const recurringItems = allRecurringItems.filter((i) => i.active);
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const snapshots = useLiveQuery(() => db.snapshots.orderBy('period').toArray(), []) ?? [];

  const [quickAdd, setQuickAdd] = useState<'income' | 'expense' | null>(null);

  const bankTotal = accounts.filter((a) => a.type === 'courant' || a.type === 'livret').reduce((s, a) => s + a.balance, 0);
  const cashTotal = accounts.filter((a) => a.type === 'compte-titre' || a.type === 'pea').reduce((s, a) => s + a.balance, 0);
  const securitiesTotal = securities.reduce((s, sec) => s + sec.quantity * sec.currentPrice, 0);
  const netWorth = bankTotal + cashTotal + securitiesTotal;

  const pieData = [
    { name: 'Comptes & livrets', value: bankTotal, color: BUCKET_COLORS.bank },
    { name: 'Liquidités placées', value: cashTotal, color: BUCKET_COLORS.cash },
    { name: 'Titres', value: securitiesTotal, color: BUCKET_COLORS.securities },
  ].filter((d) => d.value > 0);

  const period = currentPeriod();
  const { income: monthIncome, expense: monthExpense } = monthTotals(transactions, period);
  const previous = monthTotals(transactions, previousPeriod());
  const incomeChange = percentChange(monthIncome, previous.income);
  const expenseChange = percentChange(monthExpense, previous.expense);
  const remaining = remainingToLive(transactions, allRecurringItems);

  const byCategory = expensesByCategory(transactions, period);
  // Every budgeted category is listed (even at 0 €), then unbudgeted spending.
  const categoryRows = [
    ...budgets.map((b) => ({ category: b.category, amount: byCategory.find((c) => c.category === b.category)?.amount ?? 0, budget: b.amount as number | undefined })),
    ...byCategory.filter((c) => !budgets.some((b) => b.category === c.category)).map((c) => ({ ...c, budget: undefined as number | undefined })),
  ];
  const categoryScale = Math.max(1, ...categoryRows.map((r) => Math.max(r.amount, r.budget ?? 0)));

  const advice = computeAdvice({ accounts, securities, transactions, recurringItems: allRecurringItems, budgets, goals });

  const history = snapshots.slice(-12).map((s) => ({ ...s, label: periodLabel(s.period).slice(0, 3) }));

  const upcoming = useMemo(() => {
    return [...recurringItems]
      .map((item) => ({ item, daysUntil: daysUntilNext(item.dayOfMonth) }))
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [recurringItems]);

  const recentTx = realTransactions(transactions).slice(0, 5);

  const toggleGoalDone = async (goal: Goal) => {
    if (goal.recurring) {
      const period = currentPeriod();
      const periods = goal.completedPeriods ?? [];
      const updated = periods.includes(period) ? periods.filter((p) => p !== period) : [...periods, period];
      await db.goals.update(goal.id!, { completedPeriods: updated });
    } else {
      await db.goals.update(goal.id!, { achieved: !goal.achieved });
    }
  };

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-muted">Bonjour 👋</p>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Votre budget</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Button className="w-full" onClick={() => setQuickAdd('income')}>
          <ArrowDownLeft size={17} /> Entrée
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setQuickAdd('expense')}>
          <ArrowUpRight size={17} /> Dépense
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BentoCard span="full" noPad className="overflow-hidden">
          <div className="p-5 flex items-center gap-4">
            <div className="w-24 h-24 shrink-0 relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={30} outerRadius={44} paddingAngle={3} stroke="none">
                      {pieData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full rounded-full bg-primary-50 flex items-center justify-center">
                  <Wallet size={26} className="text-primary-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Patrimoine total</p>
              <p className="text-3xl font-bold text-ink tracking-tight mt-0.5">{formatMoney(netWorth)}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {pieData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1 text-[11px] text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard span="sm">
          <CardLabel icon={<ArrowDownLeft size={13} className="text-primary-600" />}>Revenus</CardLabel>
          <p className="text-lg sm:text-xl font-bold whitespace-nowrap tabular-nums text-primary-700">{formatMoney(monthIncome)}</p>
          <ChangeHint change={incomeChange} goodWhenUp />
        </BentoCard>
        <BentoCard span="sm">
          <CardLabel icon={<ArrowUpRight size={13} className="text-red-500 dark:text-red-400" />}>Dépenses</CardLabel>
          <p className="text-lg sm:text-xl font-bold whitespace-nowrap tabular-nums text-red-500 dark:text-red-400">{formatMoney(monthExpense)}</p>
          <ChangeHint change={expenseChange} />
        </BentoCard>

        <BentoCard span="full">
          <CardLabel icon={<PiggyBank size={13} className="text-primary-600" />}>Reste à vivre ce mois</CardLabel>
          <p className={`text-2xl font-bold ${remaining.total < 0 ? 'text-red-500 dark:text-red-400' : 'text-ink'}`}>
            {formatMoney(remaining.total)}
          </p>
          <p className="text-xs text-muted mt-1">
            Revenus − dépenses du mois
            {remaining.upcomingIncome > 0 && `, + ${formatMoney(remaining.upcomingIncome)} de revenus à venir`}
            {remaining.upcomingExpense > 0 && `, − ${formatMoney(remaining.upcomingExpense)} de charges à venir`}
          </p>
        </BentoCard>

        <AdviceCard advice={advice} />

        {categoryRows.length > 0 && (
          <BentoCard span="full">
            <CardLabel icon={<ChartBar size={13} className="text-primary-600" />}>Dépenses par catégorie</CardLabel>
            <div className="flex flex-col gap-3 mt-2">
              {categoryRows.map((r) => {
                const over = r.budget !== undefined && r.amount > r.budget;
                return (
                  <div key={r.category} title={`${r.category} : ${formatMoney(r.amount)}${r.budget ? ` sur ${formatMoney(r.budget)}` : ''}`}>
                    <div className="flex items-baseline justify-between gap-2 text-sm mb-1">
                      <span className="font-medium truncate">{r.category}</span>
                      <span className="text-muted shrink-0">
                        <span className="font-semibold text-ink">{formatMoney(r.amount)}</span>
                        {r.budget !== undefined && ` / ${formatMoney(r.budget)}`}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-canvas overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${over ? 'bg-red-500 dark:bg-red-400' : 'bg-primary-600'}`}
                        style={{ width: `${(r.amount / categoryScale) * 100}%` }}
                      />
                      {r.budget !== undefined && (
                        <div className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ left: `calc(${(r.budget / categoryScale) * 100}% - 1px)` }} />
                      )}
                    </div>
                    {over && (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">
                        ⚠ Budget dépassé de {formatMoney(r.amount - (r.budget ?? 0))}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {budgets.length === 0 && (
              <p className="text-xs text-muted mt-3">Astuce : définissez des budgets par catégorie dans les Réglages.</p>
            )}
          </BentoCard>
        )}

        {history.length >= 2 && (
          <BentoCard span="full">
            <CardLabel icon={<TrendingUp size={13} className="text-primary-600" />}>Évolution du patrimoine</CardLabel>
            <div className="h-40 -mx-2 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    cursor={{ stroke: 'var(--color-muted)', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: 'var(--color-ink)' }}
                    labelFormatter={(_, payload) => (payload?.[0] ? periodLabel(payload[0].payload.period) : '')}
                    formatter={(v) => [formatMoney(Number(v)), 'Patrimoine']}
                  />
                  <Area type="monotone" dataKey="netWorth" stroke="#16A34A" strokeWidth={2} fill="url(#netWorthFill)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted mt-1">
              {formatMoneyShort(history[0].netWorth)} → {formatMoneyShort(history[history.length - 1].netWorth)} sur {history.length} mois
            </p>
          </BentoCard>
        )}

        {goals.length > 0 && (
          <BentoCard span="full" noPad>
            <div className="p-5 pb-1">
              <CardLabel icon={<Target size={13} className="text-primary-600" />}>Objectifs d'épargne</CardLabel>
            </div>
            <div className="divide-y divide-line">
              {goals.slice(0, 3).map((g) => {
                const account = accounts.find((a) => a.id === g.accountId);
                return (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    current={account ? accountValue(account, securities) : 0}
                    accountName={account?.name ?? 'Compte supprimé'}
                    onToggleDone={() => toggleGoalDone(g)}
                  />
                );
              })}
            </div>
          </BentoCard>
        )}

        <BentoCard span="full">
          <CardLabel icon={<Sparkles size={13} className="text-primary-600" />}>Prochaines échéances</CardLabel>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted py-2">Aucune charge ou abonnement configuré.</p>
          ) : (
            <div className="flex flex-col gap-2.5 mt-1">
              {upcoming.map(({ item, daysUntil }) => (
                <div key={item.id} className="flex items-center gap-3">
                  <IconBadge emoji={item.emoji} color={item.color} logo={item.logo} size={34} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted">
                      {daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil} jours`} · le {item.dayOfMonth}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${item.kind === 'income' ? 'text-primary-700' : 'text-ink'}`}>
                    {item.kind === 'income' ? '+' : '-'}
                    {formatMoney(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </BentoCard>

        {accounts.length > 0 && (
          <BentoCard span="full">
            <CardLabel icon={<Wallet size={13} className="text-primary-600" />}>Mes comptes</CardLabel>
            <div className="flex flex-col gap-2.5 mt-1">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <IconBadge emoji={resolveAccountIcon(a)} color={a.color} size={32} />
                  <p className="flex-1 text-sm font-medium text-left truncate">{a.name}</p>
                  <p className="text-sm font-semibold">{formatMoney(a.balance)}</p>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {recentTx.length > 0 && (
          <BentoCard span="full">
            <CardLabel>Derniers mouvements</CardLabel>
            <div className="flex flex-col gap-2.5 mt-1">
              {recentTx.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      t.type === 'income' ? 'bg-primary-50 text-primary-600' : 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'
                    }`}
                  >
                    {t.type === 'income' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{t.label}</p>
                    <p className="text-xs text-muted">{formatDateShort(t.date)}</p>
                  </div>
                  <p className="text-sm font-semibold">
                    {t.type === 'income' ? '+' : '-'}
                    {formatMoney(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          </BentoCard>
        )}
      </div>

      <Sheet open={quickAdd !== null} onClose={() => setQuickAdd(null)} title={quickAdd === 'income' ? 'Nouvelle entrée' : 'Nouvelle dépense'}>
        {quickAdd && <QuickAddForm type={quickAdd} accounts={accounts} onDone={() => setQuickAdd(null)} />}
      </Sheet>
    </div>
  );
}

function QuickAddForm({
  type,
  accounts,
  onDone,
}: {
  type: 'income' | 'expense';
  accounts: Account[];
  onDone: () => void;
}) {
  return <TransactionForm accounts={accounts} onDone={onDone} initialType={type} />;
}

function ChangeHint({ change, goodWhenUp = false }: { change: number | null; goodWhenUp?: boolean }) {
  if (change === null) return <p className="text-xs text-muted mt-1">Ce mois-ci</p>;
  const up = change >= 0;
  const good = up === goodWhenUp;
  return (
    <p className={`text-xs font-medium mt-1 ${good ? 'text-primary-700' : 'text-red-600 dark:text-red-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(change).toFixed(0)} % vs mois dernier
    </p>
  );
}
