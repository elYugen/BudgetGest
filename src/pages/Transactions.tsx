import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../db/db';
import { PageHeader } from '../components/layout/PageHeader';
import { BentoCard } from '../components/ui/BentoCard';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Form';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { formatMoney, formatDateLong, periodLabel } from '../lib/format';

export function Transactions() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? [];
  const [open, setOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const period = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthOffset]);

  const monthTx = transactions.filter((t) => t.date.startsWith(period));
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof monthTx>();
    for (const t of monthTx) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [monthTx]);

  const accountName = (id?: number) => accounts.find((a) => a.id === id)?.name ?? 'Sans compte';

  const deleteTx = async (id: number, accountId: number | undefined, amount: number, type: 'income' | 'expense') => {
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      await db.transactions.delete(id);
      const acc = accountId ? await db.accounts.get(accountId) : undefined;
      if (acc) {
        await db.accounts.update(acc.id!, {
          balance: acc.balance - (type === 'income' ? amount : -amount),
        });
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="Mouvements"
        subtitle="Vos dépenses et entrées d'argent"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} /> Ajouter
          </Button>
        }
      />

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

      {grouped.length === 0 && (
        <p className="text-center text-sm text-muted py-16">Aucun mouvement ce mois-ci.</p>
      )}

      <div className="flex flex-col gap-5">
        {grouped.map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{formatDateLong(date)}</p>
            <BentoCard span="full" noPad className="divide-y divide-line">
              {items.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      t.type === 'income' ? 'bg-primary-50 text-primary-600' : 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'
                    }`}
                  >
                    {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate">{t.label}</p>
                    <p className="text-xs text-muted">
                      {t.category} · {accountName(t.accountId)}
                    </p>
                  </div>
                  <p className={`font-semibold ${t.type === 'income' ? 'text-primary-700' : 'text-ink'}`}>
                    {t.type === 'income' ? '+' : '-'}
                    {formatMoney(t.amount)}
                  </p>
                  <button
                    onClick={() => deleteTx(t.id!, t.accountId, t.amount, t.type)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </BentoCard>
          </div>
        ))}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nouveau mouvement">
        <TransactionForm accounts={accounts} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}
