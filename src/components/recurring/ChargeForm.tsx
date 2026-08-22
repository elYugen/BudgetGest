import { useState, type FormEvent } from 'react';
import { db } from '../../db/db';
import type { Account, RecurringItem, RecurringKind } from '../../db/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../db/types';
import { Field, Input, Select, Button } from '../ui/Form';
import { EMOJI_CHOICES } from '../../lib/subscriptionCatalog';
import { parseAmount } from '../../lib/format';
import { processRecurringItems } from '../../lib/autoProcess';

export function ChargeForm({
  kind,
  accounts,
  initial,
  onDone,
}: {
  kind: RecurringKind;
  accounts: Account[];
  initial?: RecurringItem;
  onDone: () => void;
}) {
  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const [label, setLabel] = useState(initial?.label ?? (kind === 'income' ? 'Salaire' : ''));
  const [amount, setAmount] = useState(initial?.amount?.toString().replace('.', ',') ?? '');
  const [day, setDay] = useState(initial?.dayOfMonth?.toString() ?? (kind === 'income' ? '28' : '5'));
  const [category, setCategory] = useState(initial?.category ?? categories[0]);
  const [emoji, setEmoji] = useState(initial?.emoji ?? (kind === 'income' ? '💰' : '🧾'));
  const [accountId, setAccountId] = useState<number | ''>(initial?.accountId ?? accounts[0]?.id ?? '');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount(amount);
    const d = parseInt(day, 10);
    if (!label.trim()) {
      setError(kind === 'income' ? 'Merci de nommer ce revenu.' : 'Merci de nommer cette charge.');
      return;
    }
    if (!amt || amt <= 0) {
      setError('Merci de renseigner un montant valide (ex. 1200,00).');
      return;
    }
    if (!d || d < 1 || d > 31) {
      setError('Merci de renseigner un jour entre 1 et 31.');
      return;
    }
    setError('');
    const payload: RecurringItem = {
      kind,
      label: label.trim(),
      amount: amt,
      dayOfMonth: Math.min(Math.max(d, 1), 31),
      category,
      color: kind === 'income' ? '#16A34A' : '#F97316',
      emoji,
      accountId: accountId ? Number(accountId) : undefined,
      active: initial?.active ?? true,
    };
    if (initial?.id) {
      await db.recurringItems.update(initial.id, payload);
    } else {
      await db.recurringItems.add(payload);
    }
    await processRecurringItems();
    onDone();
  };

  return (
    <form onSubmit={submit}>
      <Field label={kind === 'income' ? 'Nom du revenu' : 'Nom de la charge'}>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={kind === 'income' ? 'Ex. Salaire, primes...' : 'Ex. Loyer, assurance...'}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant mensuel (€)">
          <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label={kind === 'income' ? 'Jour de versement' : 'Jour de prélèvement'}>
          <Input type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </div>
      <Field label="Icône">
        <div className="flex flex-wrap gap-2">
          {EMOJI_CHOICES.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setEmoji(em)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border ${
                emoji === em ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-canvas'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Catégorie">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      {accounts.length > 0 && (
        <Field label={kind === 'income' ? 'Compte crédité (optionnel)' : 'Compte prélevé (optionnel)'}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Aucun</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>}
      <Button type="submit" className="w-full mt-2">
        {initial ? 'Enregistrer' : 'Ajouter'}
      </Button>
    </form>
  );
}
