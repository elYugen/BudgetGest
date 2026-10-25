import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import type { TxType } from '../../db/types';
import { Input, Button, SegmentedControl } from '../ui/Form';
import { addCategory, deleteCategory, setBudget } from '../../lib/categories';
import { parseAmount } from '../../lib/format';
import { confirmAction } from '../ui/ConfirmDialog';

// Lists categories of one type; expense categories also get a monthly budget field.
export function CategoriesSettings() {
  const [type, setType] = useState<TxType>('expense');
  const categories = useLiveQuery(() => db.categories.where('type').equals(type).sortBy('id'), [type]) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = await addCategory(type, name);
    setError(err ?? '');
    if (!err) setName('');
  };

  const remove = async (id: number, catName: string) => {
    if (!(await confirmAction(`Supprimer la catégorie "${catName}" ? Les mouvements existants la conservent.`))) return;
    await deleteCategory(id);
  };

  return (
    <div>
      <SegmentedControl
        value={type}
        onChange={(v) => {
          setType(v);
          setError('');
        }}
        options={[
          { value: 'expense', label: 'Dépenses' },
          { value: 'income', label: 'Entrées' },
        ]}
      />
      {type === 'expense' && (
        <p className="text-xs text-muted mt-3">Budget mensuel facultatif : laissez vide pour ne pas suivre la catégorie.</p>
      )}
      <div className="flex flex-col divide-y divide-line mt-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2 py-2">
            <span className="flex-1 min-w-0 text-sm font-medium truncate">{c.name}</span>
            {type === 'expense' && (
              <BudgetInput
                key={`${c.name}-${budgets.find((b) => b.category === c.name)?.amount ?? ''}`}
                initial={budgets.find((b) => b.category === c.name)?.amount}
                onSave={(amount) => setBudget(c.name, amount)}
              />
            )}
            <button
              onClick={() => remove(c.id!, c.name)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              aria-label={`Supprimer ${c.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2 mt-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle catégorie" />
        <Button type="submit" variant="ghost" aria-label="Ajouter la catégorie">
          <Plus size={16} />
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-2">{error}</p>}
    </div>
  );
}

function BudgetInput({ initial, onSave }: { initial?: number; onSave: (amount: number | null) => void }) {
  const [value, setValue] = useState(initial?.toString().replace('.', ',') ?? '');
  const commit = () => {
    const amount = value.trim() ? parseAmount(value) : null;
    if (amount !== null && (Number.isNaN(amount) || amount < 0)) return;
    if (amount === (initial ?? null)) return;
    onSave(amount);
  };
  return (
    <div className="relative w-28 shrink-0">
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        placeholder="Budget"
        className="py-1.5 pr-7 text-right text-sm"
        aria-label="Budget mensuel"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">€</span>
    </div>
  );
}
