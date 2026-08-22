export const parseAmount = (raw: string): number => parseFloat(raw.replace(',', '.').trim());

export const formatMoney = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);

export const formatMoneyShort = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `${(value / 1000).toFixed(1).replace('.0', '')} k€`;
  }
  return formatMoney(value);
};

export const currentPeriod = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const periodLabel = (period: string): string => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatDateShort = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export const formatDateLong = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const clampDayOfMonth = (day: number, year: number, monthIndex: number): number => {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, last);
};
