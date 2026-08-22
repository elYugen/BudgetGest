import { useState, type FormEvent } from 'react';
import { db } from '../../db/db';
import type { Security } from '../../db/types';
import { Field, Input, Button } from '../ui/Form';
import { parseAmount } from '../../lib/format';

export function SecurityForm({
  accountId,
  initial,
  onDone,
}: {
  accountId: number;
  initial?: Security;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [quantity, setQuantity] = useState(initial?.quantity?.toString().replace('.', ',') ?? '');
  const [buyPrice, setBuyPrice] = useState(initial?.buyPrice?.toString().replace('.', ',') ?? '');
  const [currentPrice, setCurrentPrice] = useState(initial?.currentPrice?.toString().replace('.', ',') ?? '');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const qty = parseAmount(quantity);
    if (!name.trim()) {
      setError('Merci de donner un nom à ce titre.');
      return;
    }
    if (!qty || qty <= 0) {
      setError('Merci de renseigner une quantité valide.');
      return;
    }
    setError('');
    const payload: Security = {
      accountId,
      name: name.trim(),
      ticker: ticker.trim().toUpperCase(),
      quantity: qty,
      buyPrice: buyPrice ? parseAmount(buyPrice) || 0 : 0,
      currentPrice: currentPrice ? parseAmount(currentPrice) || 0 : buyPrice ? parseAmount(buyPrice) || 0 : 0,
    };
    if (initial?.id) {
      await db.securities.update(initial.id, payload);
    } else {
      await db.securities.add(payload);
    }
    onDone();
  };

  return (
    <form onSubmit={submit}>
      <Field label="Nom du titre">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. LVMH, MSCI World ETF..." autoFocus />
      </Field>
      <Field label="Ticker / ISIN (optionnel)">
        <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ex. MC.PA" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantité">
          <Input type="text" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Prix d'achat moyen (€)">
          <Input type="text" inputMode="decimal" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0,00" />
        </Field>
      </div>
      <Field label="Cours actuel (€)">
        <Input type="text" inputMode="decimal" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="0,00" />
      </Field>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>}
      <Button type="submit" className="w-full mt-2">
        {initial ? 'Enregistrer' : 'Ajouter le titre'}
      </Button>
    </form>
  );
}
