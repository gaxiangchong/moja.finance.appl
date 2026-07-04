// ── Transactions ──

export type TransactionType = 'credit' | 'debit';
export type PaymentClass = 'bill' | 'reimbursement';
export type TransactionSource = 'manual' | 'ai-extracted' | 'payroll' | string;

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  account: string;
  description: string;
  category: string;
  paymentClass: PaymentClass | string;
  staffName: string;
  ref: string;
  notes: string;
  source: TransactionSource;
}

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  account?: string;
  category?: string;
  notes?: string;
}

// ── Employees & leave ──

export type EmployeeStatus = 'active' | 'inactive';
export type Residency = 'resident' | 'non-resident' | string;
export type MaritalStatus =
  | 'single'
  | 'married'
  | 'married-spouse-not-working'
  | string;

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  ic: string;
  position: string;
  department: string;
  joinDate: string;
  basicSalary: number;
  workDays: number;
  dailyHours: number;
  residency: Residency;
  marital: MaritalStatus;
  children: number;
  epfNo: string;
  socsoNo: string;
  taxNo: string;
  bank: string;
  bankAcc: string;
  status: EmployeeStatus | string;
  endDate: string;
  packageId: string;
  /** CSV of weekday indices (0=Sun … 6=Sat); '' = 7-day week; null = legacy default Sat+Sun */
  restDays: string | null;
}

export type LeaveType =
  | 'annual'
  | 'medical'
  | 'emergency'
  | 'maternity'
  | 'paternity'
  | 'unpaid'
  | string;

export type LeaveStatus = 'approved' | 'pending' | 'rejected' | string;

export interface LeaveRecord {
  id: string;
  employeeId: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  status: LeaveStatus;
  reason: string;
}

// ── Public holidays ──

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  type: string;
  rate: number;
}

export interface PublicHolidaySeed {
  date: string;
  name: string;
  type: string;
}

// ── Pay items ──

export type PayItemType = 'allowance' | 'claim' | 'overtime' | 'ph';
export type OTType = 'weekday' | 'restday' | 'holiday';

export interface PayItem {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  type: PayItemType;
  label: string;
  otType: OTType | string;
  hours: number;
  phDays: number;
  amount: number;
  notes: string;
}

// ── Bonus packages ──

export interface SOPTier {
  minScore: number;
  amount: number;
}

export interface CompanyTier {
  minSales: number;
  amount: number;
}

export interface BonusPackage {
  id: string;
  name: string;
  sopEnabled: boolean;
  sopTiers: SOPTier[];
  perunitEnabled: boolean;
  perunitLabel: string;
  perunitRate: number;
  companyEnabled: boolean;
  companyTiers: CompanyTier[];
}

export interface BonusBreakdownLine {
  label: string;
  amount: number;
}

export interface BonusInputs {
  sopScore?: number;
  units?: number;
}

// ── Payroll ──

export type PayrollRunStatus = 'draft' | 'finalized';

export interface LeaveBreakdown {
  unpaid: number;
  annual: number;
  medical: number;
  emergency: number;
  maternity: number;
  paternity: number;
  total: number;
  [key: string]: number;
}

export interface PayItemTotals {
  allowances: number;
  otAmt: number;
  phPay: number;
  claims: number;
}

export interface EmployedDaysResult {
  daysEmployed: number;
  daysInMonth: number;
  prorated: boolean;
}

export interface StatutoryAmounts {
  employee: number;
  employer: number;
}

export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  position: string;
  basicSalary: number;
  proratedBasic: number;
  daysEmployed: number;
  daysInMonth: number;
  unpaidDays: number;
  unpaidAmt: number;
  attendance: LeaveBreakdown;
  allowances: number;
  otAmt: number;
  phPay: number;
  claims: number;
  commission: number;
  sopScore: number;
  units: number;
  packageId: string;
  bonus: number;
  bonusBreakdown: BonusBreakdownLine[];
  gross: number;
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcb: number;
  totalDeductions: number;
  netPay: number;
  employerCost: number;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  entries: PayrollEntry[];
  holidays?: PublicHoliday[];
  companySales?: number;
  processedDate?: string;
  totalGross?: number;
  totalNet?: number;
  totalCost?: number;
}

export interface GeneratePayrollParams {
  month: number;
  year: number;
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  payItems: PayItem[];
  bonusPackages: BonusPackage[];
  publicHolidays: PublicHoliday[];
  transactions: Transaction[];
  payrollRuns: PayrollRun[];
  prevDraft?: PayrollRun | null;
}

export interface GeneratePayrollResult {
  run?: PayrollRun;
  error?: string;
}

export interface OTEntry {
  type: OTType | string;
  hours: number;
}

// ── LLM ──

export type LLMProvider = 'claude' | 'ollama' | 'lmstudio' | 'openai-compat';

export interface ProviderDefaults {
  base: string;
  model: string;
  keyRequired: boolean;
}

export interface LLMSettings {
  provider: LLMProvider;
  model: string;
  base: string;
  key: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  base: string;
  key: string;
}

export interface ExtractFromFileParams {
  file: File;
  cfg: LLMConfig;
  pclass?: PaymentClass | string;
  staffName?: string;
  defaultCat?: string;
}

export interface ExtractFromFileResult {
  items: ExtractedTransaction[];
  filename: string;
}

export interface LLMTestResult {
  ok: boolean;
  message: string;
}

// ── Sync & storage ──

export type SyncStatus = 'syncing' | 'synced' | 'error' | 'offline';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export interface AppData {
  transactions: Transaction[];
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  payrollRuns: PayrollRun[];
  payItems: PayItem[];
  bonusPackages: BonusPackage[];
  publicHolidays: PublicHoliday[];
}

// ── Supabase row shapes (snake_case) ──

export interface TransactionRow {
  id: string;
  date: string;
  amount: number;
  type: string;
  account: string;
  description: string;
  category: string;
  payment_class: string;
  staff_name: string;
  ref: string;
  notes: string;
  source: string;
}

export interface EmployeeRow {
  id: string;
  name: string;
  employee_id: string;
  ic: string;
  position: string;
  department: string;
  join_date: string;
  basic_salary: number;
  work_days: number;
  daily_hours: number;
  residency: string;
  marital: string;
  children: number;
  epf_no: string;
  socso_no: string;
  tax_no: string;
  bank: string;
  bank_acc: string;
  status: string;
  end_date: string | null;
  package_id: string | null;
  rest_days: string | null;
}

export interface LeaveRecordRow {
  id: string;
  employee_id: string;
  type: string;
  from_date: string;
  to_date: string;
  days: number;
  status: string;
  reason: string;
}

export interface PublicHolidayRow {
  id: string;
  date: string;
  name: string;
  type: string;
  rate: number;
}

export interface PayrollRunRow {
  id: string;
  month: number;
  year: number;
  status: string;
  processed_date?: string;
  total_gross?: number;
  total_net?: number;
  total_cost?: number;
  entries: PayrollEntry[];
}

export interface PayItemRow {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  type: string;
  label: string;
  ot_type: string;
  hours: number;
  ph_days: number;
  amount: number;
  notes: string;
}

export interface BonusPackageRow {
  id: string;
  name: string;
  sop_enabled: boolean;
  sop_tiers: SOPTier[];
  perunit_enabled: boolean;
  perunit_label: string;
  perunit_rate: number;
  company_enabled: boolean;
  company_tiers: CompanyTier[];
}

// ── Date filtering ──

export type DatePeriod = 'mtd' | 'ytd' | 'last30' | 'last90' | 'all';

export interface DateRange {
  from: Date;
  to: Date;
}
