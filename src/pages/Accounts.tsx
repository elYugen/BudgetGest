import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { db } from '../db/db';
import type { Account, Security, Goal } from '../db/types';
import { ACCOUNT_TYPE_LABELS } from '../db/types';
import { PageHeader } from '../components/layout/PageHeader';
import { BentoCard } from '../components/ui/BentoCard';
import { IconBadge } from '../components/ui/IconBadge';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Form';
import { AccountForm } from '../components/accounts/AccountForm';
import { SecurityForm } from '../components/accounts/SecurityForm';
import { GoalForm } from '../components/goals/GoalForm';
import { GoalRow } from '../components/goals/GoalRow';
import { formatMoney } from '../lib/format';
import { accountValue } from '../lib/accountValue';
import { resolveAccountIcon } from '../lib/accountIcons';

export function Accounts() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const securities = useLiveQuery(() => db.securities.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];

  const [accountSheet, setAccountSheet] = useState<{ open: boolean; editing?: Account }>({ open: false });
  const [securitySheet, setSecuritySheet] = useState<{ open: boolean; accountId?: number; editing?: Security }>({
    open: false,
  });
  const [goalSheet, setGoalSheet] = useState<{ open: boolean; editing?: Goal }>({ open: false });

  const banking = accounts.filter((a) => a.type === 'courant' || a.type === 'livret');
  const investing = accounts.filter((a) => a.type === 'compte-titre' || a.type === 'pea');

  const totalBanking = banking.reduce((s, a) => s + a.balance, 0);
  const totalCash = investing.reduce((s, a) => s + a.balance, 0);
  const totalSecurities = securities.reduce((s, sec) => s + sec.quantity * sec.currentPrice, 0);
  const patrimoine = totalBanking + totalCash + totalSecurities;

  const deleteAccount = async (id: number) => {
    if (!confirm('Supprimer ce compte et ses données associées ?')) return;
    await db.transaction('rw', db.accounts, db.securities, db.transactions, db.recurringItems, db.goals, async () => {
      await db.accounts.delete(id);
      await db.securities.where('accountId').equals(id).delete();
      await db.transactions.where('accountId').equals(id).delete();
      await db.goals.where('accountId').equals(id).delete();
      const items = await db.recurringItems.where('accountId').equals(id).toArray();
      await Promise.all(items.map((i) => db.recurringItems.update(i.id!, { accountId: undefined })));
    });
  };

  const deleteSecurity = async (id: number) => {
    if (!confirm('Supprimer ce titre ?')) return;
    await db.securities.delete(id);
  };

  const deleteGoal = async (id: number) => {
    if (!confirm('Supprimer cet objectif ?')) return;
    await db.goals.delete(id);
  };

  return (
    <div>
      <PageHeader
        title="Comptes & Patrimoine"
        subtitle={`Patrimoine total ${formatMoney(patrimoine)}`}
        action={
          <Button onClick={() => setAccountSheet({ open: true })}>
            <Plus size={17} /> Compte
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <BentoCard span="sm" noPad className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Comptes & livrets</p>
          <p className="text-xl font-bold mt-1">{formatMoney(totalBanking)}</p>
        </BentoCard>
        <BentoCard span="sm" noPad className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Portefeuille titres</p>
          <p className="text-xl font-bold mt-1">{formatMoney(totalCash + totalSecurities)}</p>
        </BentoCard>
      </div>

      <div className="flex items-center justify-between mb-3 mt-1">
        <div className="flex items-center gap-1.5">
          <Target size={14} className="text-primary-600" />
          <SectionTitle noMargin>Objectifs d'épargne</SectionTitle>
        </div>
        <button onClick={() => setGoalSheet({ open: true })} className="text-primary-700 hover:bg-primary-50 rounded-full p-1.5">
          <Plus size={16} />
        </button>
      </div>
      {goals.length === 0 ? (
        <EmptyRow onClick={() => setGoalSheet({ open: true })} label="Fixer un objectif (ex. 1000€ sur un livret)" />
      ) : (
        <BentoCard span="full" noPad className="divide-y divide-line mb-7">
          {goals.map((g) => {
            const account = accounts.find((a) => a.id === g.accountId);
            return (
              <GoalRow
                key={g.id}
                goal={g}
                current={account ? accountValue(account, securities) : 0}
                accountName={account?.name ?? 'Compte supprimé'}
                onEdit={() => setGoalSheet({ open: true, editing: g })}
                onDelete={() => deleteGoal(g.id!)}
              />
            );
          })}
        </BentoCard>
      )}

      <SectionTitle>Comptes bancaires</SectionTitle>
      {banking.length === 0 && (
        <EmptyRow onClick={() => setAccountSheet({ open: true })} label="Ajouter un compte courant ou un livret" />
      )}
      <div className="flex flex-col gap-3 mb-7">
        {banking.map((a) => (
          <BentoCard key={a.id} span="full" noPad className="p-4">
            <div className="flex items-center gap-3">
              <IconBadge emoji={resolveAccountIcon(a)} color={a.color} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate text-left">{a.name}</p>
                <p className="text-xs text-muted text-left">{ACCOUNT_TYPE_LABELS[a.type]}</p>
              </div>
              <p className="font-bold text-lg">{formatMoney(a.balance)}</p>
              <div className="flex gap-1 ml-1">
                <IconButton onClick={() => setAccountSheet({ open: true, editing: a })}>
                  <Pencil size={15} />
                </IconButton>
                <IconButton onClick={() => deleteAccount(a.id!)} danger>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </div>
          </BentoCard>
        ))}
      </div>

      <SectionTitle>Compte-titres & PEA</SectionTitle>
      {investing.length === 0 && (
        <EmptyRow onClick={() => setAccountSheet({ open: true })} label="Ajouter un compte-titres ou un PEA" />
      )}
      <div className="flex flex-col gap-3">
        {investing.map((a) => {
          const accSecurities = securities.filter((s) => s.accountId === a.id);
          const value = accSecurities.reduce((s, sec) => s + sec.quantity * sec.currentPrice, 0);
          const cost = accSecurities.reduce((s, sec) => s + sec.quantity * sec.buyPrice, 0);
          const gain = value - cost;
          return (
            <BentoCard key={a.id} span="full" noPad className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <IconBadge emoji={resolveAccountIcon(a)} color={a.color} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate text-left">{a.name}</p>
                  <p className="text-xs text-muted text-left">
                    {ACCOUNT_TYPE_LABELS[a.type]} · Liquidités {formatMoney(a.balance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatMoney(value + a.balance)}</p>
                  {cost > 0 && (
                    <p className={`text-xs font-semibold flex items-center gap-0.5 justify-end ${gain >= 0 ? 'text-primary-600' : 'text-red-500 dark:text-red-400'}`}>
                      {gain >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {formatMoney(gain)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-1">
                  <IconButton onClick={() => setAccountSheet({ open: true, editing: a })}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton onClick={() => deleteAccount(a.id!)} danger>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>

              {accSecurities.length > 0 && (
                <div className="mt-3 border-t border-line pt-3 flex flex-col gap-2">
                  {accSecurities.map((s) => {
                    const secGain = (s.currentPrice - s.buyPrice) * s.quantity;
                    const secGainPct = s.buyPrice > 0 ? ((s.currentPrice - s.buyPrice) / s.buyPrice) * 100 : 0;
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted">
                            {s.quantity} × {formatMoney(s.currentPrice)}
                            {s.ticker ? ` · ${s.ticker}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatMoney(s.quantity * s.currentPrice)}</p>
                          <p className={`text-xs ${secGain >= 0 ? 'text-primary-600' : 'text-red-500 dark:text-red-400'}`}>
                            {secGain >= 0 ? '+' : ''}
                            {secGainPct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <IconButton onClick={() => setSecuritySheet({ open: true, accountId: a.id!, editing: s })}>
                            <Pencil size={13} />
                          </IconButton>
                          <IconButton onClick={() => deleteSecurity(s.id!)} danger>
                            <Trash2 size={13} />
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setSecuritySheet({ open: true, accountId: a.id! })}
                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary-300 text-primary-700 text-sm font-medium py-2 hover:bg-primary-50 transition-colors"
              >
                <Plus size={15} /> Ajouter un titre
              </button>
            </BentoCard>
          );
        })}
      </div>

      <Sheet
        open={accountSheet.open}
        onClose={() => setAccountSheet({ open: false })}
        title={accountSheet.editing ? 'Modifier le compte' : 'Nouveau compte'}
      >
        <AccountForm initial={accountSheet.editing} onDone={() => setAccountSheet({ open: false })} />
      </Sheet>

      <Sheet
        open={securitySheet.open}
        onClose={() => setSecuritySheet({ open: false })}
        title={securitySheet.editing ? 'Modifier le titre' : 'Nouveau titre'}
      >
        {securitySheet.accountId && (
          <SecurityForm
            accountId={securitySheet.accountId}
            initial={securitySheet.editing}
            onDone={() => setSecuritySheet({ open: false })}
          />
        )}
      </Sheet>

      <Sheet
        open={goalSheet.open}
        onClose={() => setGoalSheet({ open: false })}
        title={goalSheet.editing ? "Modifier l'objectif" : 'Nouvel objectif'}
      >
        <GoalForm accounts={accounts} initial={goalSheet.editing} onDone={() => setGoalSheet({ open: false })} />
      </Sheet>
    </div>
  );
}

function SectionTitle({ children, noMargin }: { children: string; noMargin?: boolean }) {
  return <h2 className={`text-sm font-semibold text-muted uppercase tracking-wide ${noMargin ? '' : 'mb-3 mt-1'}`}>{children}</h2>;
}

function EmptyRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary-300 text-primary-700 text-sm font-medium py-4 mb-6 hover:bg-primary-50 transition-colors"
    >
      <Plus size={16} /> {label}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${
        danger ? 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10' : 'text-muted hover:bg-canvas'
      }`}
    >
      {children}
    </button>
  );
}
