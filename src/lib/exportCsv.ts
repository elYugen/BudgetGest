import { db } from '../db/db';
import { ACCOUNT_TYPE_LABELS } from '../db/types';
import { formatDateLong, todayISO } from './format';

// Semicolon-delimited CSV (the default list separator Excel expects on French systems)
// with a UTF-8 BOM so accents and the € sign display correctly when opened in Excel.
function toCsv(rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((row) => row.map(escape).join(';')).join('\r\n');
}

function download(filename: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportAccountsCsv() {
  const accounts = await db.accounts.toArray();
  const rows: (string | number)[][] = [['Nom', 'Type', 'Solde (EUR)']];
  for (const a of accounts) rows.push([a.name, ACCOUNT_TYPE_LABELS[a.type], a.balance.toFixed(2)]);
  download(`comptes-${todayISO()}.csv`, toCsv(rows));
}

export async function exportSecuritiesCsv() {
  const [securities, accounts] = await Promise.all([db.securities.toArray(), db.accounts.toArray()]);
  const accName = (id: number) => accounts.find((a) => a.id === id)?.name ?? '';
  const rows: (string | number)[][] = [
    ['Compte', 'Nom', 'Ticker', 'Quantité', "Prix d'achat (EUR)", 'Cours actuel (EUR)', 'Valeur (EUR)', 'Plus/moins-value (EUR)'],
  ];
  for (const s of securities) {
    rows.push([
      accName(s.accountId),
      s.name,
      s.ticker,
      s.quantity,
      s.buyPrice.toFixed(2),
      s.currentPrice.toFixed(2),
      (s.quantity * s.currentPrice).toFixed(2),
      ((s.currentPrice - s.buyPrice) * s.quantity).toFixed(2),
    ]);
  }
  download(`titres-${todayISO()}.csv`, toCsv(rows));
}

export async function exportTransactionsCsv() {
  const [transactions, accounts] = await Promise.all([
    db.transactions.orderBy('date').toArray(),
    db.accounts.toArray(),
  ]);
  const accName = (id?: number) => accounts.find((a) => a.id === id)?.name ?? '';
  const rows: (string | number)[][] = [['Date', 'Type', 'Libellé', 'Catégorie', 'Compte', 'Montant (EUR)']];
  for (const t of transactions) {
    rows.push([
      formatDateLong(t.date),
      t.type === 'income' ? 'Entrée' : 'Dépense',
      t.label,
      t.category,
      accName(t.accountId),
      (t.type === 'income' ? t.amount : -t.amount).toFixed(2),
    ]);
  }
  download(`mouvements-${todayISO()}.csv`, toCsv(rows));
}

export async function exportRecurringCsv() {
  const [items, accounts] = await Promise.all([db.recurringItems.toArray(), db.accounts.toArray()]);
  const accName = (id?: number) => (id ? accounts.find((a) => a.id === id)?.name ?? '' : '');
  const kindLabel = { income: 'Revenu', expense: 'Charge fixe', subscription: 'Abonnement' } as const;
  const rows: (string | number)[][] = [
    ['Type', 'Nom', 'Catégorie', 'Montant mensuel (EUR)', 'Jour du mois', 'Compte', 'Actif'],
  ];
  for (const i of items) {
    rows.push([kindLabel[i.kind], i.label, i.category, i.amount.toFixed(2), i.dayOfMonth, accName(i.accountId), i.active ? 'Oui' : 'Non']);
  }
  download(`recurrent-${todayISO()}.csv`, toCsv(rows));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function exportAllCsv() {
  await exportAccountsCsv();
  await wait(150);
  await exportTransactionsCsv();
  await wait(150);
  await exportRecurringCsv();
  await wait(150);
  await exportSecuritiesCsv();
}
