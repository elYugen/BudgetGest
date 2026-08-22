import { useState, type FormEvent } from 'react';
import { db } from '../../db/db';
import type { Account, AccountType } from '../../db/types';
import { ACCOUNT_TYPE_COLORS, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from '../../db/types';
import { Field, Input, Button } from '../ui/Form';
import { ACCOUNT_ICONS, ACCOUNT_ICON_CHOICES } from '../../lib/accountIcons';
import { parseAmount } from '../../lib/format';

const TYPES: AccountType[] = ['courant', 'livret', 'compte-titre', 'pea'];

export function AccountForm({ initial, onDone }: { initial?: Account; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'courant');
  const [balance, setBalance] = useState(initial?.balance?.toString().replace('.', ',') ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? ACCOUNT_TYPE_ICONS.courant);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Merci de donner un nom à ce compte.');
      return;
    }
    setError('');
    const payload: Account = {
      name: name.trim(),
      type,
      balance: balance ? parseAmount(balance) || 0 : 0,
      color: ACCOUNT_TYPE_COLORS[type],
      icon,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    if (initial?.id) {
      await db.accounts.update(initial.id, payload);
    } else {
      await db.accounts.add(payload);
    }
    onDone();
  };

  return (
    <form onSubmit={submit}>
      <Field label="Nom du compte">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Compte courant BNP"
          autoFocus
        />
      </Field>
      <Field label="Type de compte">
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => {
            const TypeIcon = ACCOUNT_ICONS[ACCOUNT_TYPE_ICONS[t]];
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  if (!initial) setIcon(ACCOUNT_TYPE_ICONS[t]);
                }}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  type === t
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-line text-muted hover:border-primary-200'
                }`}
              >
                <TypeIcon size={16} strokeWidth={2.2} />
                {ACCOUNT_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Icône">
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_ICON_CHOICES.map((key) => {
            const Icon = ACCOUNT_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  icon === key ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-transparent bg-canvas text-muted'
                }`}
              >
                <Icon size={17} strokeWidth={2.2} />
              </button>
            );
          })}
        </div>
      </Field>
      <Field label={type === 'courant' || type === 'livret' ? 'Solde actuel' : 'Liquidités disponibles'}>
        <Input
          type="text"
          inputMode="decimal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0,00"
        />
      </Field>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>}
      <Button type="submit" className="w-full mt-2">
        {initial ? 'Enregistrer' : 'Ajouter le compte'}
      </Button>
    </form>
  );
}
