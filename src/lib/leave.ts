export function yearsOfService(joinDate: string): number {
  const j = new Date(joinDate);
  const n = new Date();
  return (n.getTime() - j.getTime()) / (365.25 * 24 * 3600 * 1000);
}

export function leaveEntitlement(joinDate: string): { annual: number; medical: number } {
  const yrs = yearsOfService(joinDate);
  return {
    annual: yrs < 2 ? 8 : yrs < 5 ? 12 : 16,
    medical: yrs < 2 ? 14 : yrs < 5 ? 18 : 22,
  };
}

export function countLeaveDays(from: string, to: string, isWorkDayFn: (d: Date) => boolean): number {
  const fromD = new Date(from + 'T00:00:00');
  const toD = new Date(to + 'T00:00:00');
  let days = 0;
  const cur = new Date(fromD);
  while (cur <= toD) {
    if (isWorkDayFn(cur)) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
