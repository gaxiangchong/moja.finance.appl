/** Short month names for dashboards and labels */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmt(n: number): string {
  return 'RM ' + Math.abs(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtSigned(n: number): string {
  return (n >= 0 ? '+' : '-') + fmt(n);
}

export function fmt2(n: number | null | undefined): string {
  return Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
