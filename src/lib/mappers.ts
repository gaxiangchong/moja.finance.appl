import type {
  BonusPackage,
  BonusPackageRow,
  BonusBreakdownLine,
  BonusInputs,
  Employee,
  EmployeeRow,
  LeaveRecord,
  LeaveRecordRow,
  PayItem,
  PayItemRow,
  PayrollEntry,
  PayrollRun,
  PayrollRunRow,
  PublicHoliday,
  PublicHolidayRow,
  Transaction,
  TransactionRow,
} from './types';

export const toTx = (r: TransactionRow): Transaction => ({
  id: r.id,
  date: r.date,
  amount: r.amount,
  type: r.type as Transaction['type'],
  account: r.account || '',
  description: r.description || '',
  category: r.category || 'Other',
  paymentClass: r.payment_class || 'bill',
  staffName: r.staff_name || '',
  ref: r.ref || '',
  notes: r.notes || '',
  source: r.source || 'manual',
});

export const toTxRow = (t: Transaction): TransactionRow => ({
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

export const toEmp = (r: EmployeeRow): Employee => ({
  id: r.id,
  name: r.name,
  employeeId: r.employee_id,
  ic: r.ic,
  position: r.position,
  department: r.department,
  joinDate: r.join_date,
  basicSalary: r.basic_salary,
  workDays: r.work_days,
  dailyHours: r.daily_hours,
  residency: r.residency,
  marital: r.marital,
  children: r.children,
  epfNo: r.epf_no,
  socsoNo: r.socso_no,
  taxNo: r.tax_no,
  bank: r.bank,
  bankAcc: r.bank_acc,
  status: r.status,
  endDate: r.end_date || '',
  packageId: r.package_id || '',
  restDays: r.rest_days != null ? r.rest_days : null,
});

export const toEmpRow = (e: Employee): EmployeeRow => ({
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

export const toLeave = (r: LeaveRecordRow): LeaveRecord => ({
  id: r.id,
  employeeId: r.employee_id,
  type: r.type,
  from: r.from_date,
  to: r.to_date,
  days: r.days,
  status: r.status,
  reason: r.reason || '',
});

export const toLeaveRow = (l: LeaveRecord): LeaveRecordRow => ({
  id: l.id,
  employee_id: l.employeeId,
  type: l.type,
  from_date: l.from,
  to_date: l.to,
  days: l.days,
  status: l.status,
  reason: l.reason,
});

export const toHoliday = (r: PublicHolidayRow): PublicHoliday => ({
  id: r.id,
  date: r.date,
  name: r.name,
  type: r.type || 'Federal',
  rate: r.rate != null ? Number(r.rate) : 1.5,
});

export const toHolidayRow = (h: PublicHoliday): PublicHolidayRow => ({
  id: h.id,
  date: h.date,
  name: h.name,
  type: h.type,
  rate: h.rate,
});

export const toRun = (r: PayrollRunRow): PayrollRun => ({
  id: r.id,
  month: r.month,
  year: r.year,
  status: r.status as PayrollRun['status'],
  processedDate: r.processed_date,
  totalGross: r.total_gross,
  totalNet: r.total_net,
  totalCost: r.total_cost,
  entries: r.entries || [],
});

export const toRunRow = (r: PayrollRun): PayrollRunRow => ({
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

export const toPayItem = (r: PayItemRow): PayItem => ({
  id: r.id,
  employeeId: r.employee_id,
  month: r.month,
  year: r.year,
  type: r.type as PayItem['type'],
  label: r.label || '',
  otType: r.ot_type || '',
  hours: r.hours != null ? Number(r.hours) : 0,
  phDays: r.ph_days != null ? Number(r.ph_days) : 0,
  amount: r.amount != null ? Number(r.amount) : 0,
  notes: r.notes || '',
});

export const toPayItemRow = (p: PayItem): PayItemRow => ({
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

export const toPackage = (r: BonusPackageRow): BonusPackage => ({
  id: r.id,
  name: r.name,
  sopEnabled: !!r.sop_enabled,
  sopTiers: r.sop_tiers || [],
  perunitEnabled: !!r.perunit_enabled,
  perunitLabel: r.perunit_label || 'unit',
  perunitRate: r.perunit_rate != null ? Number(r.perunit_rate) : 0,
  companyEnabled: !!r.company_enabled,
  companyTiers: r.company_tiers || [],
});

export const toPackageRow = (p: BonusPackage): BonusPackageRow => ({
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

export type { BonusBreakdownLine, PayrollEntry };
