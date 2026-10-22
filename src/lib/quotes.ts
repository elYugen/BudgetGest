import { db } from '../db/db';
import type { Security } from '../db/types';

// Quotes come from onvista.de's public API: no key, CORS-enabled (callable straight from
// the browser), and it lists every venue an instrument trades on, so a price in euros is
// available for French stocks and ETFs (Euronext Paris) as well as US stocks (German venues).
// Instruments are identified by ISIN; the onvista reference ("STOCK/85653") is cached on
// the security once resolved.

const API = 'https://api.onvista.de/api/v1';
const STALE_AFTER_MS = 30 * 60 * 1000;
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

// Venue preference for the euro price: Euronext Paris first (PEA valuation), then the
// other Euronext venues and Xetra; otherwise the most recent euro quote wins.
const PREFERRED_MARKETS = ['_PAR', '_AMS', '_BRU', '_LIS', '_MIL', '_GER'];

export const isIsin = (value: string) => ISIN_RE.test(value.trim().toUpperCase());

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path);
  } catch {
    throw new Error('Service de cours injoignable. Vérifiez votre connexion.');
  }
  if (!res.ok) throw new Error(res.status === 404 ? 'Titre introuvable.' : `Erreur ${res.status} du service de cours.`);
  return res.json() as Promise<T>;
}

export interface InstrumentMatch {
  quoteId: string;
  isin: string;
  name: string;
  type: string;
}

interface SearchResponse {
  list?: { entityType: string; entitySubType?: string; entityValue: string; name: string; isin?: string; displayType?: string }[];
}

const TYPE_LABELS: Record<string, string> = { STOCK: 'Action', FUND: 'Fonds', BOND: 'Obligation', DERIVATIVE: 'Dérivé', CERTIFICATE: 'Certificat' };

export async function searchInstruments(query: string): Promise<InstrumentMatch[]> {
  if (!query.trim()) return [];
  const data = await get<SearchResponse>(`/instruments/query?searchValue=${encodeURIComponent(query.trim())}&limit=10`);
  return (data.list ?? [])
    .filter((i) => i.isin && i.entityType !== 'INDEX')
    .map((i) => ({
      quoteId: `${i.entityType}/${i.entityValue}`,
      isin: i.isin!,
      name: i.name,
      type: i.entitySubType === 'ETF' ? 'ETF' : (TYPE_LABELS[i.entityType] ?? i.displayType ?? i.entityType),
    }));
}

// Finds the onvista reference of an ISIN (exact ISIN match only, never a guess).
export async function resolveIsin(isin: string): Promise<string> {
  const match = (await searchInstruments(isin)).find((m) => m.isin === isin.trim().toUpperCase());
  if (!match) throw new Error(`ISIN ${isin} introuvable.`);
  return match.quoteId;
}

interface VenueQuote {
  last: number;
  isoCurrency: string;
  datetimeLast: string;
  market?: { codeMarket?: string; name?: string };
}

interface SnapshotResponse {
  quote?: VenueQuote;
  quoteList?: { list?: VenueQuote[] };
}

export function pickEuroQuote(quotes: VenueQuote[]): VenueQuote | undefined {
  const euro = quotes.filter((q) => q.isoCurrency === 'EUR' && typeof q.last === 'number' && q.last > 0);
  for (const code of PREFERRED_MARKETS) {
    const q = euro.find((x) => x.market?.codeMarket === code);
    if (q) return q;
  }
  return euro.sort((a, b) => b.datetimeLast.localeCompare(a.datetimeLast))[0];
}

export async function fetchEuroPrice(quoteId: string): Promise<{ price: number; market: string }> {
  const data = await get<SnapshotResponse>(`/instruments/${quoteId}/snapshot`);
  const quotes = [...(data.quoteList?.list ?? []), ...(data.quote ? [data.quote] : [])];
  const q = pickEuroQuote(quotes);
  if (!q) throw new Error('Aucune cotation en euros pour ce titre.');
  return { price: q.last, market: q.market?.name ?? '' };
}

// Onvista reference for a security: cached, or resolved from an ISIN stored as its ticker.
async function quoteIdFor(s: Security): Promise<string | null> {
  if (s.quoteId) return s.quoteId;
  if (!isIsin(s.ticker)) return null;
  const quoteId = await resolveIsin(s.ticker);
  await db.securities.update(s.id!, { quoteId });
  return quoteId;
}

export interface RefreshResult {
  updated: number;
  failed: string[];
  // Securities without ISIN: the user must pick them once with the search in the form.
  unidentified: string[];
}

export async function refreshAllQuotes(): Promise<RefreshResult> {
  const securities = await db.securities.toArray();
  const result: RefreshResult = { updated: 0, failed: [], unidentified: [] };
  const now = new Date().toISOString();

  await Promise.all(
    securities.map(async (s) => {
      try {
        const quoteId = await quoteIdFor(s);
        if (!quoteId) {
          result.unidentified.push(s.name);
          return;
        }
        const { price } = await fetchEuroPrice(quoteId);
        await db.securities.update(s.id!, { currentPrice: price, priceUpdatedAt: now });
        result.updated++;
      } catch {
        result.failed.push(s.name);
      }
    }),
  );
  return result;
}

let refreshing: Promise<RefreshResult> | null = null;

// Silent background refresh, at most every 30 minutes, for identifiable securities.
export async function refreshQuotesIfStale(): Promise<void> {
  if (refreshing) return;
  const securities = (await db.securities.toArray()).filter((s) => s.quoteId || isIsin(s.ticker));
  if (securities.length === 0) return;
  const oldest = Math.min(...securities.map((s) => (s.priceUpdatedAt ? Date.parse(s.priceUpdatedAt) : 0)));
  if (Date.now() - oldest < STALE_AFTER_MS) return;
  refreshing = refreshAllQuotes().finally(() => {
    refreshing = null;
  });
  await refreshing.catch(() => undefined);
}
