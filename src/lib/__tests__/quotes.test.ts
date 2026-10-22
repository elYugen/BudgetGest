import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/db';
import { pickEuroQuote, refreshAllQuotes, searchInstruments } from '../quotes';

const quote = (codeMarket: string, last: number, isoCurrency = 'EUR', datetimeLast = '2026-10-22T15:00:00Z') => ({
  last,
  isoCurrency,
  datetimeLast,
  market: { codeMarket, name: codeMarket },
});

// Minimal onvista API double: search by ISIN or name, snapshot by reference.
const INSTRUMENTS = [
  { entityType: 'STOCK', entityValue: '85653', name: 'LVMH', isin: 'FR0000121014', quotes: [quote('_GAT', 390.45), quote('_PAR', 387.8), quote('_PNK', 434, 'USD')] },
  { entityType: 'FUND', entitySubType: 'ETF', entityValue: '14352926', name: 'Amundi MSCI World II', isin: 'FR0010315770', quotes: [quote('_LSE', 490, 'USD'), quote('_GER', 436.72)] },
  { entityType: 'STOCK', entityValue: '86627', name: 'Apple', isin: 'US0378331005', quotes: [quote('_NMS', 346.84, 'USD')] },
];

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  vi.stubGlobal('fetch', async (input: string) => {
    const url = new URL(input);
    const search = url.searchParams.get('searchValue');
    if (search !== null) {
      const list = INSTRUMENTS.filter((i) => i.isin === search || i.name.toLowerCase().includes(search.toLowerCase()));
      return new Response(JSON.stringify({ list }));
    }
    const [, type, id] = url.pathname.match(/instruments\/(\w+)\/(\w+)\/snapshot/) ?? [];
    const inst = INSTRUMENTS.find((i) => i.entityType === type && i.entityValue === id);
    if (!inst) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify({ quote: inst.quotes[0], quoteList: { list: inst.quotes } }));
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('quotes', () => {
  it('prefers Euronext Paris, then other preferred venues, then the latest euro quote', () => {
    expect(pickEuroQuote([quote('_GAT', 1), quote('_PAR', 2)])?.last).toBe(2);
    expect(pickEuroQuote([quote('_GAT', 1), quote('_GER', 3)])?.last).toBe(3);
    expect(pickEuroQuote([quote('_STU', 1, 'EUR', '2026-10-22T10:00Z'), quote('_TRO', 4, 'EUR', '2026-10-22T19:00Z')])?.last).toBe(4);
    expect(pickEuroQuote([quote('_NMS', 5, 'USD')])).toBeUndefined();
  });

  it('searches by name and labels ETFs', async () => {
    expect(await searchInstruments('amundi')).toEqual([
      { quoteId: 'FUND/14352926', isin: 'FR0010315770', name: 'Amundi MSCI World II', type: 'ETF' },
    ]);
  });

  it('refreshes by cached reference or ISIN, and never guesses from an exchange ticker', async () => {
    await db.securities.bulkAdd([
      { accountId: 1, name: 'LVMH', ticker: 'FR0000121014', quantity: 1, buyPrice: 300, currentPrice: 300 },
      { accountId: 1, name: 'World', ticker: 'FR0010315770', quoteId: 'FUND/14352926', quantity: 2, buyPrice: 400, currentPrice: 400 },
      { accountId: 1, name: 'Apple', ticker: 'US0378331005', quantity: 1, buyPrice: 150, currentPrice: 150 },
      { accountId: 1, name: 'Air Liquide', ticker: 'AI.PA', quantity: 1, buyPrice: 170, currentPrice: 170 },
    ]);
    const result = await refreshAllQuotes();
    expect(result).toEqual({ updated: 2, failed: ['Apple'], unidentified: ['Air Liquide'] });

    const after = await db.securities.toArray();
    expect(after.map((s) => s.currentPrice)).toEqual([387.8, 436.72, 150, 170]);
    expect(after[0].quoteId).toBe('STOCK/85653');
  });
});
