import { useState, type FormEvent } from 'react';
import { db } from '../../db/db';
import type { Account, Goal } from '../../db/types';
import { Field, Input, Select, Button } from '../ui/Form';
import { EMOJI_CHOICES, COLOR_CHOICES } from '../../lib/subscriptionCatalog';
import { parseAmount } from '../../lib/format';

export function GoalForm({
  accounts,
  initial,
  onDone,
}: {
  accounts: Account[];
  initial?: Goal;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [targetAmount, setTargetAmount] = useState(initial?.targetAmount?.toString().replace('.', ',') ?? '');
  const [accountId, setAccountId] = useState<number | ''>(initial?.accountId ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🎯');
  const [color, setColor] = useState(initial?.color ?? '#16A34A');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const target = parseAmount(targetAmount);
    if (!label.trim()) {
      setError('Merci de donner un nom à cet objectif.');
      return;
    }
    if (!target || target <= 0) {
      setError('Merci de renseigner un montant cible valide (ex. 1000).');
      return;
    }
    if (!accountId) {
      setError('Merci de choisir le compte concerné.');
      return;
    }
    setError('');
    const payload: Goal = {
      label: label.trim(),
      targetAmount: target,
      accountId: Number(accountId),
      emoji,
      color,
      deadline: deadline || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    if (initial?.id) {
      await db.goals.update(initial.id, payload);
    } else {
      await db.goals.add(payload);
    }
    onDone();
  };

  if (accounts.length === 0) {
    return <p className="text-sm text-muted">Créez d'abord un compte pour lui fixer un objectif.</p>;
  }

  return (
    <form onSubmit={submit}>
      <Field label="Nom de l'objectif">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex. Épargne de précaution, Investir sur mon PEA..."
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant cible (€)">
          <Input type="text" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="1 000" />
        </Field>
        <Field label="Échéance (optionnel)">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
      </div>
      <Field label="Compte concerné">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Choisir un compte…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
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
      <Field label="Couleur">
        <div className="flex flex-wrap gap-2">
          {COLOR_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2"
              style={{ background: c, borderColor: color === c ? 'var(--color-ink)' : 'transparent' }}
            />
          ))}
        </div>
      </Field>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>}
      <Button type="submit" className="w-full mt-2">
        {initial ? 'Enregistrer' : "Ajouter l'objectif"}
      </Button>
    </form>
  );
}
