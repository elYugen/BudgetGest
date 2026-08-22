import { useState, type FormEvent } from 'react';
import { db } from '../../db/db';
import type { Account, TxType } from '../../db/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../db/types';
import { Field, Input, Select, Button, SegmentedControl } from '../ui/Form';
import { todayISO, parseAmount } from '../../lib/format';

export function TransactionForm({
  accounts,
  onDone,
  initialType = 'expense',
}: {
  accounts: Account[];
  onDone: () => void;
  initialType?: TxType;
}) {
  const [type, setType] = useState<TxType>(initialType);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(initialType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  const [accountId, setAccountId] = useState<number | ''>(accounts[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount(amount);
    if (!label.trim()) {
      setError('Merci de renseigner un libellé.');
      return;
    }
    if (!amt || amt <= 0) {
      setError('Merci de renseigner un montant valide (ex. 42,50).');
      return;
    }
    if (!accountId) {
      setError('Merci de choisir un compte.');
      return;
    }
    setError('');
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      await db.transactions.add({
        accountId: accountId as number,
        date,
        amount: amt,
        type,
        category,
        label: label.trim(),
      });
      const acc = await db.accounts.get(accountId as number);
      if (acc) {
        await db.accounts.update(acc.id!, {
          balance: acc.balance + (type === 'income' ? amt : -amt),
        });
      }
    });
    onDone();
  };

  if (accounts.length === 0) {
    return <p className="text-sm text-muted">Créez d'abord un compte dans l'onglet Comptes.</p>;
  }

  return (
    <form onSubmit={submit}>
      <Field label="Type">
        <SegmentedControl
          value={type}
          onChange={(v) => {
            setType(v);
            setCategory(v === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
          }}
          options={[
            { value: 'expense', label: 'Dépense' },
            { value: 'income', label: 'Entrée' },
          ]}
        />
      </Field>
      <Field label="Libellé">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Courses Carrefour" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant (€)">
          <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Catégorie">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Compte">
        <Select value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
            </option>
          ))}
        </Select>
      </Field>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>}
      <Button type="submit" className="w-full mt-2">
        Ajouter
      </Button>
    </form>
  );
}
