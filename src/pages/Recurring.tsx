import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../db/db';
import type { RecurringItem, RecurringKind } from '../db/types';
import { PageHeader } from '../components/layout/PageHeader';
import { BentoCard } from '../components/ui/BentoCard';
import { IconBadge } from '../components/ui/IconBadge';
import { Sheet } from '../components/ui/Sheet';
import { MonthCalendar } from '../components/recurring/MonthCalendar';
import { SubscriptionForm } from '../components/recurring/SubscriptionForm';
import { ChargeForm } from '../components/recurring/ChargeForm';
import { formatMoney, clampDayOfMonth, periodLabel } from '../lib/format';

export function Recurring() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const items = useLiveQuery(() => db.recurringItems.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [sheet, setSheet] = useState<{ open: boolean; kind?: RecurringKind; editing?: RecurringItem }>({
    open: false,
  });

  const { viewedYear, viewedMonth, viewedPeriod } = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return {
      viewedYear: d.getFullYear(),
      viewedMonth: d.getMonth(),
      viewedPeriod: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  }, [monthOffset]);

  const active = items.filter((i) => i.active);
  const filtered = selectedDay ? active.filter((i) => i.dayOfMonth === selectedDay) : active;

  const incomes = filtered.filter((i) => i.kind === 'income');
  const charges = filtered.filter((i) => i.kind === 'expense');
  const subs = filtered.filter((i) => i.kind === 'subscription');

  const totalIncome = active.filter((i) => i.kind === 'income').reduce((s, i) => s + i.amount, 0);
  const totalCharges = active.filter((i) => i.kind === 'expense').reduce((s, i) => s + i.amount, 0);
  const totalSubs = active.filter((i) => i.kind === 'subscription').reduce((s, i) => s + i.amount, 0);

  const isPaid = (itemId: number) =>
    transactions.some((t) => t.recurringItemId === itemId && t.date.startsWith(viewedPeriod));

  const togglePaid = async (item: RecurringItem) => {
    const existing = transactions.find((t) => t.recurringItemId === item.id && t.date.startsWith(viewedPeriod));
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      if (existing) {
        await db.transactions.delete(existing.id!);
        if (item.accountId) {
          const acc = await db.accounts.get(item.accountId);
          if (acc) {
            await db.accounts.update(acc.id!, {
              balance: acc.balance - (item.kind === 'income' ? existing.amount : -existing.amount),
            });
          }
        }
      } else {
        const day = clampDayOfMonth(item.dayOfMonth, viewedYear, viewedMonth);
        const date = `${viewedPeriod}-${String(day).padStart(2, '0')}`;
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
      }
    });
  };

  const remove = async (item: RecurringItem) => {
    if (!confirm(`Supprimer "${item.label}" ?`)) return;
    await db.recurringItems.delete(item.id!);
  };

  const openNew = (kind: RecurringKind) => setSheet({ open: true, kind });
  const openEdit = (item: RecurringItem) => setSheet({ open: true, kind: item.kind, editing: item });

  return (
    <div>
      <PageHeader title="Récurrent" subtitle="Salaire, charges fixes et abonnements — prélevés automatiquement" />

      <BentoCard span="full" className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="w-8 h-8 rounded-full bg-canvas border border-line flex items-center justify-center hover:bg-primary-50"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="font-semibold text-sm capitalize">{periodLabel(viewedPeriod)}</p>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            className="w-8 h-8 rounded-full bg-canvas border border-line flex items-center justify-center hover:bg-primary-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <MonthCalendar
          items={active}
          year={viewedYear}
          month={viewedMonth}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
        {selectedDay && (
          <button onClick={() => setSelectedDay(null)} className="mt-3 text-xs font-semibold text-primary-700 hover:underline">
            Voir tous les jours
          </button>
        )}
      </BentoCard>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <BentoCard noPad className="p-3.5">
          <p className="text-[11px] font-semibold uppercase text-muted">Revenus</p>
          <p className="text-base font-bold text-primary-700 mt-1">{formatMoney(totalIncome)}</p>
        </BentoCard>
        <BentoCard noPad className="p-3.5">
          <p className="text-[11px] font-semibold uppercase text-muted">Charges</p>
          <p className="text-base font-bold text-orange-600 dark:text-orange-400 mt-1">{formatMoney(totalCharges)}</p>
        </BentoCard>
        <BentoCard noPad className="p-3.5">
          <p className="text-[11px] font-semibold uppercase text-muted">Abonnements</p>
          <p className="text-base font-bold text-ink mt-1">{formatMoney(totalSubs)}</p>
        </BentoCard>
      </div>

      <RecurringSection
        title="Salaire & revenus récurrents"
        items={incomes}
        emptyLabel="Aucun revenu récurrent"
        onAdd={() => openNew('income')}
        onEdit={openEdit}
        onDelete={remove}
        onTogglePaid={togglePaid}
        isPaid={isPaid}
      />
      <RecurringSection
        title="Charges fixes"
        items={charges}
        emptyLabel="Aucune charge fixe"
        onAdd={() => openNew('expense')}
        onEdit={openEdit}
        onDelete={remove}
        onTogglePaid={togglePaid}
        isPaid={isPaid}
      />
      <RecurringSection
        title="Abonnements"
        items={subs}
        emptyLabel="Aucun abonnement"
        onAdd={() => openNew('subscription')}
        onEdit={openEdit}
        onDelete={remove}
        onTogglePaid={togglePaid}
        isPaid={isPaid}
      />

      <Sheet
        open={sheet.open}
        onClose={() => setSheet({ open: false })}
        title={
          sheet.editing
            ? 'Modifier'
            : sheet.kind === 'subscription'
            ? 'Nouvel abonnement'
            : sheet.kind === 'income'
            ? 'Nouveau revenu'
            : 'Nouvelle charge fixe'
        }
      >
        {sheet.kind === 'subscription' ? (
          <SubscriptionForm accounts={accounts} initial={sheet.editing} onDone={() => setSheet({ open: false })} />
        ) : (
          sheet.kind && (
            <ChargeForm kind={sheet.kind} accounts={accounts} initial={sheet.editing} onDone={() => setSheet({ open: false })} />
          )
        )}
      </Sheet>
    </div>
  );
}

function RecurringSection({
  title,
  items,
  emptyLabel,
  onAdd,
  onEdit,
  onDelete,
  onTogglePaid,
  isPaid,
}: {
  title: string;
  items: RecurringItem[];
  emptyLabel: string;
  onAdd: () => void;
  onEdit: (item: RecurringItem) => void;
  onDelete: (item: RecurringItem) => void;
  onTogglePaid: (item: RecurringItem) => void;
  isPaid: (id: number) => boolean;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">{title}</h2>
        <button onClick={onAdd} className="text-primary-700 hover:bg-primary-50 rounded-full p-1.5">
          <Plus size={16} />
        </button>
      </div>
      {items.length === 0 ? (
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary-300 text-primary-700 text-sm font-medium py-4 hover:bg-primary-50 transition-colors"
        >
          <Plus size={16} /> {emptyLabel}
        </button>
      ) : (
        <BentoCard span="full" noPad className="divide-y divide-line">
          {items.map((item) => {
            const paid = isPaid(item.id!);
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <IconBadge emoji={item.emoji} color={item.color} logo={item.logo} size={38} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted">Le {item.dayOfMonth} de chaque mois · {item.category}</p>
                </div>
                <p className="font-semibold shrink-0">{formatMoney(item.amount)}</p>
                <button
                  onClick={() => onTogglePaid(item)}
                  title={paid ? 'Déjà comptabilisé ce mois-ci (auto)' : 'Pas encore dû ce mois-ci — marquer comme fait'}
                  className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 border transition-colors ${
                    paid ? 'bg-primary-600 border-primary-600 text-white' : 'border-line text-muted hover:border-primary-400'
                  }`}
                >
                  <Check size={15} />
                </button>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => onEdit(item)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-canvas">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onDelete(item)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </BentoCard>
      )}
    </div>
  );
}
