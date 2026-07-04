import { PI_MONTHS } from './config';
import { fmt2 } from './format';
import type {
  BonusInputs,
  BonusPackage,
  Employee,
  GeneratePayrollParams,
  GeneratePayrollResult,
  LeaveBreakdown,
  LeaveRecord,
  OTEntry,
  PayItem,
  PayItemTotals,
  PayrollEntry,
  PayrollRun,
  PublicHoliday,
  StatutoryAmounts,
  Transaction,
} from './types';
import { uid } from './utils';

// ── Public holiday helpers ──

export function phSet(publicHolidays: PublicHoliday[]): Set<string> {
  return new Set(publicHolidays.map(h => h.date));
}

// ── Malaysia statutory calculations ──

export function calcEPF(gross: number, age60 = false): StatutoryAmounts {
  const emp = age60 ? 0.055 : 0.11;
  const er = gross > 5000 ? 0.12 : (age60 ? 0.04 : 0.13);
  return {
    employee: Math.round(gross * emp * 100) / 100,
    employer: Math.round(gross * er * 100) / 100,
  };
}

export function calcSOCSO(gross: number): StatutoryAmounts {
  if (gross > 5000) return { employee: 0, employer: 0 };
  const employee = Math.min(gross * 0.005, 19.75);
  const employer = Math.min(gross * 0.0175, 69.05);
  return {
    employee: Math.round(employee * 100) / 100,
    employer: Math.round(employer * 100) / 100,
  };
}

export function calcEIS(gross: number): StatutoryAmounts {
  const insurable = Math.min(gross, 4000);
  const rate = 0.002;
  return {
    employee: Math.round(insurable * rate * 100) / 100,
    employer: Math.round(insurable * rate * 100) / 100,
  };
}

export function calcPCB(
  annualGross: number,
  marital: string,
  spouseNotWorking: boolean,
  children: number,
  residency: string,
): number {
  if (residency === 'non-resident') {
    return Math.round(annualGross * 0.28 / 12 * 100) / 100;
  }
  let relief = 9000;
  if (marital === 'married-spouse-not-working') relief += 4000;
  if (marital.startsWith('married')) relief += children * 2000;
  const chargeable = Math.max(annualGross - relief, 0);
  let tax = 0;
  const brackets: [number, number][] = [
    [5000, 0], [15000, 0.01], [15000, 0.03], [15000, 0.08], [20000, 0.13],
    [30000, 0.21], [150000, 0.24], [150000, 0.245], [200000, 0.25], [400000, 0.26], [Infinity, 0.28],
  ];
  let remaining = chargeable;
  for (const [band, rate] of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band);
    tax += taxable * rate;
    remaining -= taxable;
  }
  return Math.max(Math.round(tax / 12 * 100) / 100, 0);
}

export function calcOT(basic: number, dailyHours: number, otEntries: OTEntry[]): number {
  const orp = basic / 26;
  const hrp = orp / dailyHours;
  let total = 0;
  for (const ot of otEntries) {
    const mult = ot.type === 'weekday' ? 1.5 : ot.type === 'restday' ? 2 : 3;
    total += hrp * mult * (ot.hours || 0);
  }
  return Math.round(total * 100) / 100;
}

export function restDaySet(emp: Employee | null | undefined): Set<number> {
  const raw = emp && emp.restDays;
  if (raw === undefined || raw === null) return new Set([0, 6]);
  if (raw === '') return new Set();
  return new Set(String(raw).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)));
}

export function isWorkDay(
  emp: Employee | null | undefined,
  dateObj: Date,
  phs?: Set<string>,
  rest?: Set<number>,
  publicHolidays?: PublicHoliday[],
): boolean {
  rest = rest ?? restDaySet(emp);
  phs = phs ?? phSet(publicHolidays ?? []);
  const ds = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  return !rest.has(dateObj.getDay()) && !phs.has(ds);
}

export function workingDaysInMonthForEmp(
  emp: Employee,
  year: number,
  month: number,
  publicHolidays: PublicHoliday[],
): number {
  const days = new Date(year, month, 0).getDate();
  const phs = phSet(publicHolidays);
  const rest = restDaySet(emp);
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (isWorkDay(emp, new Date(year, month - 1, d), phs, rest)) count++;
  }
  return count;
}

export function workingDaysInMonth(
  year: number,
  month: number,
  publicHolidays: PublicHoliday[],
): number {
  const days = new Date(year, month, 0).getDate();
  const phs = phSet(publicHolidays);
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dt = new Date(year, month - 1, d);
    const dow = dt.getDay();
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dow > 0 && dow < 6 && !phs.has(ds)) count++;
  }
  return count;
}

export function holidaysInMonth(
  year: number,
  month: number,
  publicHolidays: PublicHoliday[],
): PublicHoliday[] {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return publicHolidays
    .filter(h => (h.date || '').startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calcPHPay(
  basic: number,
  daysWorked: number,
  monthHolidays: PublicHoliday[],
): number {
  const orp = basic / 26;
  const n = Math.min(Math.max(parseInt(String(daysWorked)) || 0, 0), monthHolidays.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (monthHolidays[i].rate || 1.5) * orp;
  return Math.round(sum * 100) / 100;
}

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

export function workingDaysBetween(
  from: string,
  to: string,
  emp: Employee | null | undefined,
  publicHolidays: PublicHoliday[],
): number {
  let count = 0;
  const phs = phSet(publicHolidays);
  const rest = restDaySet(emp);
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) {
    if (isWorkDay(emp, cur, phs, rest)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function leaveBreakdownInMonth(
  empId: string,
  year: number,
  month: number,
  employees: Employee[],
  leaveRecords: LeaveRecord[],
  publicHolidays: PublicHoliday[],
): LeaveBreakdown {
  const out: LeaveBreakdown = {
    unpaid: 0, annual: 0, medical: 0, emergency: 0, maternity: 0, paternity: 0, total: 0,
  };
  const emp = employees.find(e => e.id === empId);
  const phs = phSet(publicHolidays);
  const rest = restDaySet(emp);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  leaveRecords.filter(r => r.employeeId === empId && r.status === 'approved').forEach(r => {
    const from = new Date(r.from + 'T00:00:00');
    const to = new Date(r.to + 'T00:00:00');
    let cur = from > monthStart ? new Date(from) : new Date(monthStart);
    const end = to < monthEnd ? to : monthEnd;
    while (cur <= end) {
      if (isWorkDay(emp, cur, phs, rest)) {
        out[r.type] = (out[r.type] || 0) + 1;
        out.total++;
      }
      cur.setDate(cur.getDate() + 1);
    }
  });
  return out;
}

export function employedDaysInMonth(emp: Employee, year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);
  const join = emp.joinDate ? new Date(emp.joinDate + 'T00:00:00') : monthStart;
  const end = emp.endDate ? new Date(emp.endDate + 'T00:00:00') : monthEnd;
  const start = join > monthStart ? join : monthStart;
  const stop = end < monthEnd ? end : monthEnd;
  let daysEmployed = 0;
  if (stop >= start) daysEmployed = Math.round((stop.getTime() - start.getTime()) / 86400000) + 1;
  daysEmployed = Math.max(0, Math.min(daysEmployed, daysInMonth));
  return { daysEmployed, daysInMonth, prorated: daysEmployed < daysInMonth };
}

export function proratedBasic(basic: number, emp: Employee, year: number, month: number): number {
  const { daysEmployed, daysInMonth } = employedDaysInMonth(emp, year, month);
  if (daysEmployed >= daysInMonth) return Math.round(basic * 100) / 100;
  return Math.round(basic / daysInMonth * daysEmployed * 100) / 100;
}

export function isStatutoryEarning(type: string): boolean {
  return type !== 'claim';
}

export function computePayItemAmount(
  item: Partial<PayItem> & { type: string; year?: number; month?: number },
  emp: Employee | null | undefined,
  publicHolidays: PublicHoliday[],
): number {
  const basic = parseFloat(String(emp && emp.basicSalary)) || 0;
  const dh = parseFloat(String(emp && emp.dailyHours)) || 8;
  if (item.type === 'overtime') {
    return calcOT(basic, dh, [{ type: item.otType || 'weekday', hours: item.hours || 0 }]);
  }
  if (item.type === 'ph') {
    return calcPHPay(basic, item.phDays || 0, holidaysInMonth(item.year!, item.month!, publicHolidays));
  }
  return Math.round((parseFloat(String(item.amount)) || 0) * 100) / 100;
}

export function payItemTotals(
  empId: string,
  year: number,
  month: number,
  emp: Employee | null | undefined,
  payItems: PayItem[],
  publicHolidays: PublicHoliday[],
): PayItemTotals {
  const items = payItems.filter(p => p.employeeId === empId && p.year === year && p.month === month);
  let allowances = 0;
  let otAmt = 0;
  let phPay = 0;
  let claims = 0;
  for (const p of items) {
    const amt = computePayItemAmount(p, emp, publicHolidays);
    if (p.type === 'allowance') allowances += amt;
    else if (p.type === 'overtime') otAmt += amt;
    else if (p.type === 'ph') phPay += amt;
    else if (p.type === 'claim') claims += amt;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { allowances: r2(allowances), otAmt: r2(otAmt), phPay: r2(phPay), claims: r2(claims) };
}

export function calcBonus(
  emp: Employee,
  inputs: BonusInputs | null | undefined,
  companySales: number,
  bonusPackages: BonusPackage[],
) {
  const p = bonusPackages.find(x => x.id === emp.packageId);
  if (!p) return { total: 0, breakdown: [] as { label: string; amount: number }[] };
  const breakdown: { label: string; amount: number }[] = [];
  let total = 0;
  const sopScore = parseFloat(String(inputs && inputs.sopScore)) || 0;
  const units = parseFloat(String(inputs && inputs.units)) || 0;
  if (p.sopEnabled) {
    const tier = (p.sopTiers || []).filter(t => sopScore >= t.minScore).sort((a, b) => b.minScore - a.minScore)[0];
    if (tier) {
      total += tier.amount;
      breakdown.push({ label: `SOP performance (score ${sopScore} ≥ ${tier.minScore})`, amount: tier.amount });
    }
  }
  if (p.perunitEnabled && units > 0) {
    const amt = Math.round(units * (p.perunitRate || 0) * 100) / 100;
    total += amt;
    breakdown.push({ label: `${units} × ${p.perunitLabel || 'unit'} @ RM${fmt2(p.perunitRate || 0)}`, amount: amt });
  }
  if (p.companyEnabled) {
    const cs = parseFloat(String(companySales)) || 0;
    const tier = (p.companyTiers || []).filter(t => cs >= t.minSales).sort((a, b) => b.minSales - a.minSales)[0];
    if (tier) {
      total += tier.amount;
      breakdown.push({ label: `Company sales ≥ RM${fmt2(tier.minSales)}`, amount: tier.amount });
    }
  }
  return { total: Math.round(total * 100) / 100, breakdown };
}

export function companySalesForMonth(
  year: number,
  month: number,
  transactions: Transaction[],
): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return Math.round(
    transactions
      .filter(t => t.type === 'credit' && (t.date || '').startsWith(prefix))
      .reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0) * 100,
  ) / 100;
}

export function recalcEntry(
  entry: PayrollEntry,
  emp: Employee | null | undefined,
  companySales: number,
  bonusPackages: BonusPackage[],
): PayrollEntry {
  const basic = parseFloat(String(entry.basicSalary)) || 0;
  const earnedBasic = entry.proratedBasic != null ? entry.proratedBasic : basic;
  const bonusRes = calcBonus(emp || ({} as Employee), { sopScore: entry.sopScore, units: entry.units }, companySales, bonusPackages);
  entry.bonus = bonusRes.total;
  entry.bonusBreakdown = bonusRes.breakdown;
  const gross = Math.round(
    (earnedBasic - (entry.unpaidAmt || 0) + (entry.allowances || 0)
      + (entry.otAmt || 0) + (entry.phPay || 0) + (entry.commission || 0) + (entry.bonus || 0)) * 100,
  ) / 100;
  const epf = calcEPF(gross);
  const socso = calcSOCSO(gross);
  const eis = calcEIS(gross);
  const pcb = calcPCB(
    gross * 12,
    (emp && emp.marital) || 'single',
    (emp && emp.marital) === 'married-spouse-not-working',
    (emp && emp.children) || 0,
    (emp && emp.residency) || 'resident',
  );
  const totalDeductions = Math.round((epf.employee + socso.employee + eis.employee + pcb) * 100) / 100;
  entry.gross = gross;
  entry.epfEmployee = epf.employee;
  entry.epfEmployer = epf.employer;
  entry.socsoEmployee = socso.employee;
  entry.socsoEmployer = socso.employer;
  entry.eisEmployee = eis.employee;
  entry.eisEmployer = eis.employer;
  entry.pcb = pcb;
  entry.totalDeductions = totalDeductions;
  entry.netPay = Math.round((gross - totalDeductions + (entry.claims || 0)) * 100) / 100;
  entry.employerCost = Math.round((gross + epf.employer + socso.employer + eis.employer) * 100) / 100;
  return entry;
}

export function generatePayrollEntries(params: GeneratePayrollParams): GeneratePayrollResult {
  const {
    month,
    year,
    employees,
    leaveRecords,
    payItems,
    bonusPackages,
    publicHolidays,
    transactions,
    payrollRuns,
    prevDraft = null,
  } = params;

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

  const eligible = employees.filter(e => {
    if (e.status === 'active') return employedDaysInMonth(e, year, month).daysEmployed > 0;
    return !!(e.endDate && e.endDate >= monthStart && employedDaysInMonth(e, year, month).daysEmployed > 0);
  });

  if (!eligible.length) {
    return { error: 'No employees to pay for this month' };
  }

  const existing = payrollRuns.find(r => r.month === month && r.year === year && r.status === 'finalized');
  if (existing) {
    return { error: 'Payroll for this month is already finalized' };
  }

  const monthHolidays = holidaysInMonth(year, month, publicHolidays);
  const prevSame = prevDraft && prevDraft.month === month && prevDraft.year === year && prevDraft.status === 'draft';
  const companySales = prevSame && prevDraft!.companySales != null
    ? prevDraft!.companySales!
    : companySalesForMonth(year, month, transactions);

  const prevEntry = (id: string) =>
    prevSame ? prevDraft!.entries.find(x => x.employeeId === id) : null;

  const entries = eligible.map(e => {
    const basic = parseFloat(String(e.basicSalary)) || 0;
    const att = leaveBreakdownInMonth(e.id, year, month, employees, leaveRecords, publicHolidays);
    const empDays = employedDaysInMonth(e, year, month);
    const pbasic = proratedBasic(basic, e, year, month);
    const unpaidAmt = Math.round((att.unpaid || 0) * (basic / 26) * 100) / 100;
    const pi = payItemTotals(e.id, year, month, e, payItems, publicHolidays);
    const carried = prevEntry(e.id);

    const entry: PayrollEntry = {
      employeeId: e.id,
      employeeName: e.name,
      position: e.position,
      basicSalary: basic,
      proratedBasic: pbasic,
      daysEmployed: empDays.daysEmployed,
      daysInMonth: empDays.daysInMonth,
      unpaidDays: att.unpaid || 0,
      unpaidAmt,
      attendance: att,
      allowances: pi.allowances,
      otAmt: pi.otAmt,
      phPay: pi.phPay,
      claims: pi.claims,
      commission: carried ? (carried.commission || 0) : 0,
      sopScore: carried ? (carried.sopScore || 0) : 0,
      units: carried ? (carried.units || 0) : 0,
      packageId: e.packageId || '',
      bonus: 0,
      bonusBreakdown: [],
      gross: 0,
      epfEmployee: 0,
      epfEmployer: 0,
      socsoEmployee: 0,
      socsoEmployer: 0,
      eisEmployee: 0,
      eisEmployer: 0,
      pcb: 0,
      totalDeductions: 0,
      netPay: 0,
      employerCost: 0,
    };
    return recalcEntry(entry, e, companySales, bonusPackages);
  });

  const run: PayrollRun = {
    id: uid(),
    month,
    year,
    entries,
    status: 'draft',
    holidays: monthHolidays,
    companySales,
  };

  return { run };
}

/** Recompute a payroll entry after editing basic/commission/bonus inputs (mirrors updatePayEntry). */
export function updatePayrollEntry(
  entry: PayrollEntry,
  emp: Employee,
  year: number,
  month: number,
  payItems: PayItem[],
  publicHolidays: PublicHoliday[],
  companySales: number,
  bonusPackages: BonusPackage[],
  field: 'basicSalary' | 'commission' | 'sopScore' | 'units',
  val: number,
): PayrollEntry {
  const updated = { ...entry, [field]: val };
  if (field === 'basicSalary') {
    updated.proratedBasic = proratedBasic(updated.basicSalary, emp, year, month);
  }
  const empCalc = { ...emp, basicSalary: updated.basicSalary };
  const pi = payItemTotals(updated.employeeId, year, month, empCalc, payItems, publicHolidays);
  updated.allowances = pi.allowances;
  updated.otAmt = pi.otAmt;
  updated.phPay = pi.phPay;
  updated.claims = pi.claims;
  updated.unpaidAmt = Math.round((updated.unpaidDays || 0) * ((parseFloat(String(updated.basicSalary)) || 0) / 26) * 100) / 100;
  return recalcEntry(updated, empCalc, companySales, bonusPackages);
}

export function updateCompanySalesInRun(
  run: PayrollRun,
  sales: number,
  employees: Employee[],
  bonusPackages: BonusPackage[],
): PayrollRun {
  const entries = run.entries.map(entry => {
    const emp = employees.find(e => e.id === entry.employeeId) || ({} as Employee);
    const copy = { ...entry };
    return recalcEntry(copy, { ...emp, basicSalary: entry.basicSalary }, sales, bonusPackages);
  });
  return { ...run, companySales: sales, entries };
}

export function finalizePayrollRun(
  run: PayrollRun,
): { run: PayrollRun; transactions: Transaction[] } {
  const final: PayrollRun = {
    ...run,
    status: 'finalized',
    processedDate: new Date().toISOString().slice(0, 10),
    totalGross: run.entries.reduce((s, e) => s + (e.gross || 0), 0),
    totalNet: run.entries.reduce((s, e) => s + (e.netPay || 0), 0),
    totalCost: run.entries.reduce((s, e) => s + (e.employerCost || 0), 0),
  };
  const monthStr = PI_MONTHS[run.month];
  const desc = `Payroll ${monthStr} ${run.year} (${run.entries.length} staff)`;
  const today = final.processedDate!;
  const tx1: Transaction = {
    id: uid(),
    date: today,
    amount: Math.round((final.totalNet || 0) * 100) / 100,
    type: 'debit',
    account: 'Payroll',
    description: desc + ' — Net Pay',
    category: 'Salary/Payroll',
    paymentClass: 'bill',
    staffName: '',
    ref: run.id,
    notes: `Net pay for ${run.entries.length} employees`,
    source: 'payroll',
  };
  const erContrib = Math.round(((final.totalCost || 0) - (final.totalGross || 0)) * 100) / 100;
  const tx2: Transaction = {
    id: uid(),
    date: today,
    amount: erContrib,
    type: 'debit',
    account: 'Payroll',
    description: desc + ' — Employer Contributions',
    category: 'Salary/Payroll',
    paymentClass: 'bill',
    staffName: '',
    ref: run.id,
    notes: 'EPF + SOCSO + EIS employer share',
    source: 'payroll',
  };
  return { run: final, transactions: [tx1, tx2] };
}
