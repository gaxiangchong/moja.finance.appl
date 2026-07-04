import type { DatePeriod, DateRange, Transaction } from './types';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function sanitiseSbUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return raw.trim();
  }
}

export function empInitials(name: string | null | undefined): string {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function getDateRange(period: DatePeriod): DateRange | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let from: Date;
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (period === 'mtd') {
    from = new Date(y, m, 1);
  } else if (period === 'ytd') {
    from = new Date(y, 0, 1);
  } else if (period === 'last30') {
    from = new Date(now);
    from.setDate(from.getDate() - 30);
  } else if (period === 'last90') {
    from = new Date(now);
    from.setDate(from.getDate() - 90);
  } else {
    return null;
  }
  return { from, to };
}

export function filterByDateRange(txs: Transaction[], range: DateRange | null): Transaction[] {
  if (!range) return txs;
  return txs.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d >= range.from && d <= range.to;
  });
}
