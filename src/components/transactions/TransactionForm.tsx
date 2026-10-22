import { useState, type FormEvent } from 'react';
import type { Account, Transaction, TxType } from '../../db/types';
import { Field, Input, Select, Button, SegmentedControl } from '../ui/Form';
import { todayISO, parseAmount } from '../../lib/format';
import { useCategories } from '../../lib/categories';
import { addTransaction, addTransfer, updateTransaction } from '../../lib/transactions';

type Mode = TxType | 'transfer';

export function TransactionForm({
  accounts,
  onDone,
  initialType = 'expense',
  initial,
}: {
  accounts: Account[];
  onDone: () => void;
  initialType?: TxType;
  initial?: Transaction;
}) {
  const editing = !!initial?.id;
  const [mode, setMode] = useState<Mode>(initial?.type ?? initialType);
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial?.amount?.toString().replace('.', ',') ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [accountId, setAccountId] = useState<number | ''>(initial?.accountId ?? accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState<number | ''>(accounts[1]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [error, setError] = useState('');

  const expenseCategories = useCategories('expense');
  const incomeCategories = useCategories('income');
  const categories = mode === 'income' ? incomeCategories : expenseCategories;
  // Keep a category that was deleted since this transaction was recorded selectable.
  const categoryOptions = category && !categories.includes(category) ? [category, ...categories] : categories;
  const selectedCategory = category || categories[0];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount(amount);
    if (mode !== 'transfer' && !label.trim()) {
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
    if (mode === 'transfer') {
      if (!toAccountId || toAccountId === accountId) {
        setError('Merci de choisir deux comptes différents.');
        return;
      }
      setError('');
      const to = accounts.find((a) => a.id === toAccountId);
      await addTransfer({
        fromAccountId: accountId,
        toAccountId,
        amount: amt,
        date,
        label: label.trim() || `Virement vers ${to?.name ?? 'compte'}`,
      });
      onDone();
      return;
    }
    setError('');
    const payload = {
      ...(initial?.recurringItemId ? { recurringItemId: initial.recurringItemId } : {}),
      accountId: accountId as number,
      date,
      amount: amt,
      type: mode,
      category: selectedCategory,
      label: label.trim(),
    };
    if (initial?.id) await updateTransaction(initial.id, payload);
    else await addTransaction(payload);
    onDone();
  };

  if (accounts.length === 0) {
    return <p className="text-sm text-muted">Créez d'abord un compte dans l'onglet Comptes.</p>;
  }

  return (
    <form onSubmit={submit}>
      {!editing && (
        <Field label="Type">
          <SegmentedControl
            value={mode}
            onChange={(v) => {
              setMode(v);
              setCategory('');
            }}
            options={[
              { value: 'expense', label: 'Dépense' },
              { value: 'income', label: 'Entrée' },
              ...(accounts.length > 1 ? [{ value: 'transfer' as const, label: 'Virement' }] : []),
            ]}
          />
        </Field>
      )}
      <Field label={mode === 'transfer' ? 'Libellé (facultatif)' : 'Libellé'}>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={mode === 'transfer' ? 'Ex. Épargne du mois' : 'Ex. Courses Carrefour'}
          autoFocus={!editing}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant (€)">
          <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {mode !== 'transfer' && (
        <Field label="Catégorie">
          <Select value={selectedCategory} onChange={(e) => setCategory(e.target.value)}>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={mode === 'transfer' ? 'Depuis le compte' : 'Compte'}>
        <Select value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      {mode === 'transfer' && (
        <Field label="Vers le compte">
          <Select value={toAccountId} onChange={(e) => setToAccountId(Number(e.target.value))}>
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
        {editing ? 'Enregistrer' : 'Ajouter'}
      </Button>
    </form>
  );
}
