import { useState, type FormEvent } from 'react';
import { db } from '../../db/db';
import type { Security } from '../../db/types';
import { Field, Input, Button } from '../ui/Form';
import { parseAmount } from '../../lib/format';
import { Search, RefreshCw } from 'lucide-react';
import { fetchEuroPrice, isIsin, resolveIsin, searchInstruments, type InstrumentMatch } from '../../lib/quotes';

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
  const [quoteId, setQuoteId] = useState(initial?.quoteId);
  const [matches, setMatches] = useState<InstrumentMatch[] | null>(null);
  const [lookup, setLookup] = useState<'search' | 'price' | null>(null);
  const [priceFetched, setPriceFetched] = useState(false);

  const loadPrice = async (id: string | undefined) => {
    setLookup('price');
    try {
      if (!id) {
        if (!isIsin(ticker)) throw new Error('Identifiez d’abord le titre avec la loupe.');
        id = await resolveIsin(ticker);
        setQuoteId(id);
      }
      const { price } = await fetchEuroPrice(id);
      setCurrentPrice(String(price).replace('.', ','));
      setPriceFetched(true);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cours indisponible.');
    } finally {
      setLookup(null);
    }
  };

  const search = async () => {
    // The quote service understands names and ISINs, not exchange tickers like MC.PA.
    const q = isIsin(ticker) ? ticker.trim() : name.trim() || ticker.trim();
    if (!q) {
      setError('Tapez le nom du titre ou son ISIN.');
      return;
    }
    setLookup('search');
    try {
      setMatches(await searchInstruments(q));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recherche indisponible.');
    } finally {
      setLookup(null);
    }
  };

  const choose = (m: InstrumentMatch) => {
    setTicker(m.isin);
    setQuoteId(m.quoteId);
    if (!name.trim()) setName(m.name);
    setMatches(null);
    loadPrice(m.quoteId);
  };

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
      ...(quoteId ? { quoteId } : {}),
      ...(priceFetched ? { priceUpdatedAt: new Date().toISOString() } : initial?.priceUpdatedAt ? { priceUpdatedAt: initial.priceUpdatedAt } : {}),
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
      <Field label="ISIN (optionnel, la loupe le trouve)">
        <div className="flex gap-2">
          <Input
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value);
              setQuoteId(undefined);
            }}
            placeholder="Ex. FR0000121014"
          />
          <Button variant="ghost" onClick={search} disabled={lookup !== null} aria-label="Rechercher le ticker">
            <Search size={16} />
          </Button>
        </div>
        {matches && (
          <div className="mt-2 rounded-2xl border border-line divide-y divide-line overflow-hidden">
            {matches.length === 0 && <p className="text-sm text-muted px-3 py-2.5">Aucun résultat.</p>}
            {matches.map((m) => (
              <button
                key={m.quoteId}
                type="button"
                onClick={() => choose(m)}
                className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors"
              >
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted">
                  {m.isin} · {m.type}
                </p>
              </button>
            ))}
          </div>
        )}
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
        <div className="flex gap-2">
          <Input
            type="text"
            inputMode="decimal"
            value={currentPrice}
            onChange={(e) => {
              setCurrentPrice(e.target.value);
              setPriceFetched(false);
            }}
            placeholder="0,00"
          />
          {(quoteId || isIsin(ticker)) && (
            <Button variant="ghost" onClick={() => loadPrice(quoteId)} disabled={lookup !== null} aria-label="Récupérer le cours">
              <RefreshCw size={16} className={lookup === 'price' ? 'animate-spin' : ''} />
            </Button>
          )}
        </div>
      </Field>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>}
      <Button type="submit" className="w-full mt-2">
        {initial ? 'Enregistrer' : 'Ajouter le titre'}
      </Button>
    </form>
  );
}
