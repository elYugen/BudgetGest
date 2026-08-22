import { useState, type FormEvent } from 'react';
import { db } from '../../db/db';
import type { Account, RecurringItem } from '../../db/types';
import { Field, Input, Select, Button } from '../ui/Form';
import { SUBSCRIPTION_CATALOG, EMOJI_CHOICES, COLOR_CHOICES } from '../../lib/subscriptionCatalog';
import { IconBadge } from '../ui/IconBadge';
import { parseAmount } from '../../lib/format';
import { processRecurringItems } from '../../lib/autoProcess';

export function SubscriptionForm({
  accounts,
  initial,
  onDone,
}: {
  accounts: Account[];
  initial?: RecurringItem;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial?.amount?.toString().replace('.', ',') ?? '');
  const [day, setDay] = useState(initial?.dayOfMonth?.toString() ?? '1');
  const [category, setCategory] = useState(initial?.category ?? 'Streaming');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '⭐');
  const [color, setColor] = useState(initial?.color ?? '#16A34A');
  const [logo, setLogo] = useState<string | undefined>(initial?.logo);
  const [accountId, setAccountId] = useState<number | ''>(initial?.accountId ?? accounts[0]?.id ?? '');
  const [error, setError] = useState('');

  const applyCatalog = (entry: (typeof SUBSCRIPTION_CATALOG)[number]) => {
    setName(entry.name);
    setEmoji(entry.emoji);
    setColor(entry.color);
    setCategory(entry.category);
    setLogo(entry.logo);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount(amount);
    const d = parseInt(day, 10);
    if (!name.trim()) {
      setError('Merci de donner un nom à cet abonnement.');
      return;
    }
    if (!amt || amt <= 0) {
      setError('Merci de renseigner un montant valide (ex. 13,49).');
      return;
    }
    if (!d || d < 1 || d > 31) {
      setError('Merci de renseigner un jour de prélèvement entre 1 et 31.');
      return;
    }
    setError('');
    const payload: RecurringItem = {
      kind: 'subscription',
      label: name.trim(),
      amount: amt,
      dayOfMonth: Math.min(Math.max(d, 1), 31),
      category,
      color,
      emoji,
      logo,
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
      <Field label="Service">
        <div className="flex flex-wrap gap-2 mb-3">
          {SUBSCRIPTION_CATALOG.map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => applyCatalog(entry)}
              title={entry.name}
              className={`rounded-2xl border p-1.5 transition-colors ${
                name === entry.name ? 'border-primary-500' : 'border-transparent hover:border-line'
              }`}
            >
              <IconBadge emoji={entry.emoji} color={entry.color} logo={entry.logo} size={36} />
            </button>
          ))}
        </div>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setLogo(undefined);
          }}
          placeholder="Nom de l'abonnement"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant mensuel (€)">
          <Input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="13,49"
          />
        </Field>
        <Field label="Jour de prélèvement">
          <Input type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </div>

      <Field label="Icône">
        <div className="flex flex-wrap gap-2">
          {EMOJI_CHOICES.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => {
                setEmoji(em);
                setLogo(undefined);
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border ${
                !logo && emoji === em ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-canvas'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Couleur">
        <div className="flex flex-wrap gap-2">
          {COLOR_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setLogo(undefined);
              }}
              className="w-7 h-7 rounded-full border-2"
              style={{ background: c, borderColor: color === c ? 'var(--color-ink)' : 'transparent' }}
            />
          ))}
        </div>
      </Field>

      <Field label="Catégorie">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex. Streaming" />
      </Field>

      {accounts.length > 0 && (
        <Field label="Compte prélevé (optionnel)">
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
        {initial ? 'Enregistrer' : "Ajouter l'abonnement"}
      </Button>
    </form>
  );
}
