export function getDateRange(period: string): { from: Date; to: Date } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let from: Date;

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

export function filterByDateRange<T extends { date: string }>(
  txs: T[],
  range: { from: Date; to: Date } | null,
): T[] {
  if (!range) return txs;
  return txs.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d >= range.from && d <= range.to;
  });
}
