import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { db } from '../db/db';
import type { Transaction } from '../db/types';
import { PageHeader } from '../components/layout/PageHeader';
import { BentoCard } from '../components/ui/BentoCard';
import { Sheet } from '../components/ui/Sheet';
import { Button, Input, Select } from '../components/ui/Form';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { formatMoney, formatDateLong, periodLabel } from '../lib/format';
import { deleteTransaction, isTransfer } from '../lib/transactions';
import { monthTotals } from '../lib/stats';
import { confirmAction } from '../components/ui/ConfirmDialog';

const NO_TRANSACTIONS: Transaction[] = [];

export function Transactions() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? NO_TRANSACTIONS;
  const [sheet, setSheet] = useState<{ open: boolean; editing?: Transaction }>({ open: false });
  const [monthOffset, setMonthOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState<number | ''>('');

  const period = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthOffset]);

  const searching = query.trim().length > 0;
  const { income, expense } = monthTotals(transactions, period);

  const allCategories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category))).sort((a, b) => a.localeCompare(b, 'fr')),
    [transactions],
  );

  // A text search looks through the whole history; otherwise only the selected month is shown.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        (q ? t.label.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) : t.date.startsWith(period)) &&
        (!categoryFilter || t.category === categoryFilter) &&
        (!accountFilter || t.accountId === accountFilter),
    );
  }, [transactions, period, query, categoryFilter, accountFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of visible) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visible]);

  const accountName = (id?: number) => accounts.find((a) => a.id === id)?.name ?? 'Sans compte';

  // Name of the other account involved in a transfer leg.
  const counterpart = (t: Transaction) =>
    accountName(transactions.find((o) => o.transferId === t.transferId && o.id !== t.id)?.accountId);

  const remove = async (t: Transaction) => {
    const msg = isTransfer(t) ? 'Supprimer ce virement (sur les deux comptes) ?' : `Supprimer "${t.label}" ?`;
    if (!(await confirmAction(msg))) return;
    await deleteTransaction(t.id!);
  };

  const hasFilters = searching || categoryFilter || accountFilter;

  return (
    <div>
      <PageHeader
        title="Mouvements"
        subtitle="Vos dépenses et entrées d'argent"
        action={
          <Button onClick={() => setSheet({ open: true })}>
            <Plus size={17} /> Ajouter
          </Button>
        }
      />

      <div className="relative mb-2">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans tout l'historique…"
          className="pl-10"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Toutes catégories</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Tous les comptes</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      {hasFilters && (
        <button
          onClick={() => {
            setQuery('');
            setCategoryFilter('');
            setAccountFilter('');
          }}
          className="mb-4 text-xs font-semibold text-primary-700 hover:underline flex items-center gap-1"
        >
          <X size={13} /> Effacer les filtres
        </button>
      )}

      {!searching && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMonthOffset((o) => o - 1)} className="w-9 h-9 rounded-full bg-white dark:bg-card border border-line flex items-center justify-center hover:bg-primary-50">
              <ChevronLeft size={17} />
            </button>
            <p className="font-semibold capitalize">{periodLabel(period)}</p>
            <button
              onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
              disabled={monthOffset === 0}
              className="w-9 h-9 rounded-full bg-white dark:bg-card border border-line flex items-center justify-center hover:bg-primary-50 disabled:opacity-30"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <BentoCard noPad className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-1">
                <ArrowDownLeft size={13} className="text-primary-600" /> Entrées
              </p>
              <p className="text-xl font-bold mt-1 text-primary-700">{formatMoney(income)}</p>
            </BentoCard>
            <BentoCard noPad className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-1">
                <ArrowUpRight size={13} className="text-red-500 dark:text-red-400" /> Dépenses
              </p>
              <p className="text-xl font-bold mt-1 text-red-500 dark:text-red-400">{formatMoney(expense)}</p>
            </BentoCard>
          </div>
        </>
      )}

      {grouped.length === 0 && (
        <p className="text-center text-sm text-muted py-16">
          {searching ? 'Aucun mouvement ne correspond à la recherche.' : 'Aucun mouvement ce mois-ci.'}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {grouped.map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{formatDateLong(date)}</p>
            <BentoCard span="full" noPad className="divide-y divide-line">
              {items.map((t) => {
                const transfer = isTransfer(t);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => !transfer && setSheet({ open: true, editing: t })}
                      disabled={transfer}
                      className="flex-1 min-w-0 flex items-center gap-3 text-left disabled:cursor-default"
                      aria-label={transfer ? undefined : `Modifier ${t.label}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          transfer
                            ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400'
                            : t.type === 'income'
                              ? 'bg-primary-50 text-primary-600'
                              : 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'
                        }`}
                      >
                        {transfer ? <ArrowLeftRight size={16} /> : t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{t.label}</p>
                        <p className="text-xs text-muted truncate">
                          {transfer
                            ? `${t.type === 'income' ? 'Depuis' : 'Vers'} ${counterpart(t)} · ${accountName(t.accountId)}`
                            : `${t.category} · ${accountName(t.accountId)}`}
                          {searching && ` · ${formatDateLong(t.date)}`}
                        </p>
                      </div>
                      <p className={`font-semibold ${t.type === 'income' ? 'text-primary-700' : 'text-ink'}`}>
                        {t.type === 'income' ? '+' : '-'}
                        {formatMoney(t.amount)}
                      </p>
                    </button>
                    <button
                      onClick={() => remove(t)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </BentoCard>
          </div>
        ))}
      </div>

      <Sheet
        open={sheet.open}
        onClose={() => setSheet({ open: false })}
        title={sheet.editing ? 'Modifier le mouvement' : 'Nouveau mouvement'}
      >
        <TransactionForm
          key={sheet.editing?.id ?? 'new'}
          accounts={accounts}
          initial={sheet.editing}
          onDone={() => setSheet({ open: false })}
        />
      </Sheet>
    </div>
  );
}
