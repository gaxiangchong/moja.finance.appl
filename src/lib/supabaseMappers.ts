import type {
  BonusPackage,
  Employee,
  LeaveRecord,
  PayItem,
  PayrollRun,
  PublicHoliday,
  Transaction,
} from './types';

export const toTx = (r: Record<string, unknown>): Transaction => ({
  id: r.id as string,
  date: r.date as string,
  amount: r.amount as number,
  type: r.type as Transaction['type'],
  account: (r.account as string) || '',
  description: (r.description as string) || '',
  category: (r.category as string) || 'Other',
  paymentClass: ((r.payment_class as string) || 'bill') as Transaction['paymentClass'],
  staffName: (r.staff_name as string) || '',
  ref: (r.ref as string) || '',
  notes: (r.notes as string) || '',
  source: (r.source as string) || 'manual',
});

export const toTxRow = (t: Transaction) => ({
  id: t.id,
  date: t.date,
  amount: t.amount,
  type: t.type,
  account: t.account,
  description: t.description,
  category: t.category,
  payment_class: t.paymentClass,
  staff_name: t.staffName,
  ref: t.ref,
  notes: t.notes,
  source: t.source,
});

export const toEmp = (r: Record<string, unknown>): Employee => ({
  id: r.id as string,
  name: r.name as string,
  employeeId: r.employee_id as string,
  ic: r.ic as string,
  position: r.position as string,
  department: r.department as string,
  joinDate: r.join_date as string,
  basicSalary: r.basic_salary as number,
  workDays: r.work_days as number,
  dailyHours: r.daily_hours as number,
  residency: r.residency as string,
  marital: r.marital as string,
  children: r.children as number,
  epfNo: r.epf_no as string,
  socsoNo: r.socso_no as string,
  taxNo: r.tax_no as string,
  bank: r.bank as string,
  bankAcc: r.bank_acc as string,
  status: r.status as Employee['status'],
  endDate: (r.end_date as string) || '',
  packageId: (r.package_id as string) || '',
  restDays: r.rest_days != null ? (r.rest_days as string) : null,
});

export const toEmpRow = (e: Employee) => ({
  id: e.id,
  name: e.name,
  employee_id: e.employeeId,
  ic: e.ic,
  position: e.position,
  department: e.department,
  join_date: e.joinDate,
  basic_salary: e.basicSalary,
  work_days: e.workDays,
  daily_hours: e.dailyHours,
  residency: e.residency,
  marital: e.marital,
  children: e.children,
  epf_no: e.epfNo,
  socso_no: e.socsoNo,
  tax_no: e.taxNo,
  bank: e.bank,
  bank_acc: e.bankAcc,
  status: e.status,
  end_date: e.endDate || null,
  package_id: e.packageId || null,
  rest_days: e.restDays != null && e.restDays !== '' ? e.restDays : null,
});

export const toLeave = (r: Record<string, unknown>): LeaveRecord => ({
  id: r.id as string,
  employeeId: r.employee_id as string,
  type: r.type as string,
  from: r.from_date as string,
  to: r.to_date as string,
  days: r.days as number,
  status: r.status as string,
  reason: (r.reason as string) || '',
});

export const toLeaveRow = (l: LeaveRecord) => ({
  id: l.id,
  employee_id: l.employeeId,
  type: l.type,
  from_date: l.from,
  to_date: l.to,
  days: l.days,
  status: l.status,
  reason: l.reason,
});

export const toHoliday = (r: Record<string, unknown>): PublicHoliday => ({
  id: r.id as string,
  date: r.date as string,
  name: r.name as string,
  type: (r.type as string) || 'Federal',
  rate: r.rate != null ? Number(r.rate) : 1.5,
});

export const toHolidayRow = (h: PublicHoliday) => ({
  id: h.id,
  date: h.date,
  name: h.name,
  type: h.type,
  rate: h.rate,
});

export const toRun = (r: Record<string, unknown>): PayrollRun => ({
  id: r.id as string,
  month: r.month as number,
  year: r.year as number,
  status: r.status as PayrollRun['status'],
  processedDate: r.processed_date as string | undefined,
  totalGross: r.total_gross as number | undefined,
  totalNet: r.total_net as number | undefined,
  totalCost: r.total_cost as number | undefined,
  entries: (r.entries as PayrollRun['entries']) || [],
});

export const toRunRow = (r: PayrollRun) => ({
  id: r.id,
  month: r.month,
  year: r.year,
  status: r.status,
  processed_date: r.processedDate,
  total_gross: r.totalGross,
  total_net: r.totalNet,
  total_cost: r.totalCost,
  entries: r.entries,
});

export const toPayItem = (r: Record<string, unknown>): PayItem => ({
  id: r.id as string,
  employeeId: r.employee_id as string,
  month: r.month as number,
  year: r.year as number,
  type: r.type as PayItem['type'],
  label: (r.label as string) || '',
  otType: (r.ot_type as string) || '',
  hours: r.hours != null ? Number(r.hours) : 0,
  phDays: r.ph_days != null ? Number(r.ph_days) : 0,
  amount: r.amount != null ? Number(r.amount) : 0,
  notes: (r.notes as string) || '',
});

export const toPayItemRow = (p: PayItem) => ({
  id: p.id,
  employee_id: p.employeeId,
  month: p.month,
  year: p.year,
  type: p.type,
  label: p.label,
  ot_type: p.otType,
  hours: p.hours,
  ph_days: p.phDays,
  amount: p.amount,
  notes: p.notes,
});

export const toPackage = (r: Record<string, unknown>): BonusPackage => ({
  id: r.id as string,
  name: r.name as string,
  sopEnabled: !!r.sop_enabled,
  sopTiers: (r.sop_tiers as BonusPackage['sopTiers']) || [],
  perunitEnabled: !!r.perunit_enabled,
  perunitLabel: (r.perunit_label as string) || 'unit',
  perunitRate: r.perunit_rate != null ? Number(r.perunit_rate) : 0,
  companyEnabled: !!r.company_enabled,
  companyTiers: (r.company_tiers as BonusPackage['companyTiers']) || [],
});

export const toPackageRow = (p: BonusPackage) => ({
  id: p.id,
  name: p.name,
  sop_enabled: p.sopEnabled,
  sop_tiers: p.sopTiers,
  perunit_enabled: p.perunitEnabled,
  perunit_label: p.perunitLabel,
  perunit_rate: p.perunitRate,
  company_enabled: p.companyEnabled,
  company_tiers: p.companyTiers,
});
