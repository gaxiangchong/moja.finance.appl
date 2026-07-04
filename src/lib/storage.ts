import { JOHOR_PH_2026, SUPABASE_KEY, SUPABASE_URL } from './config';
import { envLlmApiKey, envSupabaseAnonKey, envSupabaseUrl } from './env';import type {
  AppData,
  BonusPackage,
  Employee,
  LeaveRecord,
  LLMProvider,
  LLMSettings,
  PayItem,
  PayrollRun,
  PublicHoliday,
  SupabaseConfig,
  Transaction,
} from './types';
import { uid } from './utils';

// ── localStorage keys (match legacy/index.html) ──

export const STORAGE_KEYS = {
  transactions: 'moja_transactions',
  llm: 'moja_llm',
  customCats: 'moja_custom_cats',
  employees: 'moja_employees',
  leaves: 'moja_leaves',
  payrollRuns: 'moja_payrollruns',
  payItems: 'moja_payitems',
  packages: 'moja_packages',
  holidays: 'moja_holidays',
  sbUrl: 'moja_sb_url',
  sbKey: 'moja_sb_key',
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Transactions ──

export function loadTransactions(): Transaction[] {
  return readJson<Transaction[]>(STORAGE_KEYS.transactions, []);
}

export function saveTransactions(transactions: Transaction[]): void {
  writeJson(STORAGE_KEYS.transactions, transactions);
}

// ── LLM settings ──

export function loadLLMSettings(): LLMSettings {
  const s = readJson<Partial<LLMSettings>>(STORAGE_KEYS.llm, {});
  return {
    provider: (s.provider as LLMProvider) || 'claude',
    model: s.model || '',
    base: s.base || '',
    key: s.key || envLlmApiKey(),
  };
}
export function saveLLMSettings(settings: LLMSettings): void {
  writeJson(STORAGE_KEYS.llm, settings);
}

// ── Custom categories ──

export function loadCustomCategories(): string[] {
  return readJson<string[]>(STORAGE_KEYS.customCats, []);
}

export function saveCustomCategoriesRaw(custom: string[]): void {
  writeJson(STORAGE_KEYS.customCats, custom);
}

// ── Supabase config ──

export function loadSupabaseConfig(): SupabaseConfig {
  return {
    url: localStorage.getItem(STORAGE_KEYS.sbUrl) || envSupabaseUrl() || SUPABASE_URL,
    key: localStorage.getItem(STORAGE_KEYS.sbKey) || envSupabaseAnonKey() || SUPABASE_KEY,
  };
}
export function saveSupabaseConfig(url: string, key: string): void {
  localStorage.setItem(STORAGE_KEYS.sbUrl, url);
  localStorage.setItem(STORAGE_KEYS.sbKey, key.trim());
}

// ── Payroll data ──

function seedDefaultHolidays(): PublicHoliday[] {
  return JOHOR_PH_2026.map(h => ({
    id: uid(),
    date: h.date,
    name: h.name,
    type: h.type,
    rate: 1.5,
  }));
}

export function loadEmployees(): Employee[] {
  return readJson<Employee[]>(STORAGE_KEYS.employees, []);
}

export function saveEmployees(employees: Employee[]): void {
  writeJson(STORAGE_KEYS.employees, employees);
}

export function loadLeaveRecords(): LeaveRecord[] {
  return readJson<LeaveRecord[]>(STORAGE_KEYS.leaves, []);
}

export function saveLeaveRecords(leaveRecords: LeaveRecord[]): void {
  writeJson(STORAGE_KEYS.leaves, leaveRecords);
}

export function loadPayrollRuns(): PayrollRun[] {
  return readJson<PayrollRun[]>(STORAGE_KEYS.payrollRuns, []);
}

export function savePayrollRuns(payrollRuns: PayrollRun[]): void {
  writeJson(STORAGE_KEYS.payrollRuns, payrollRuns);
}

export function loadPayItems(): PayItem[] {
  return readJson<PayItem[]>(STORAGE_KEYS.payItems, []);
}

export function savePayItems(payItems: PayItem[]): void {
  writeJson(STORAGE_KEYS.payItems, payItems);
}

export function loadBonusPackages(): BonusPackage[] {
  return readJson<BonusPackage[]>(STORAGE_KEYS.packages, []);
}

export function saveBonusPackages(bonusPackages: BonusPackage[]): void {
  writeJson(STORAGE_KEYS.packages, bonusPackages);
}

export function loadPublicHolidays(): PublicHoliday[] {
  let holidays = readJson<PublicHoliday[]>(STORAGE_KEYS.holidays, []);
  if (!holidays.length) {
    holidays = seedDefaultHolidays();
    savePublicHolidays(holidays);
  }
  return holidays;
}

export function savePublicHolidays(publicHolidays: PublicHoliday[]): void {
  writeJson(STORAGE_KEYS.holidays, publicHolidays);
}

/** Load all payroll-related collections (seeds holidays on first run). */
export function loadPayrollData(): Pick<
  AppData,
  'employees' | 'leaveRecords' | 'payrollRuns' | 'payItems' | 'bonusPackages' | 'publicHolidays'
> {
  return {
    employees: loadEmployees(),
    leaveRecords: loadLeaveRecords(),
    payrollRuns: loadPayrollRuns(),
    payItems: loadPayItems(),
    bonusPackages: loadBonusPackages(),
    publicHolidays: loadPublicHolidays(),
  };
}

export function savePayrollData(data: Pick<
  AppData,
  'employees' | 'leaveRecords' | 'payrollRuns' | 'payItems' | 'bonusPackages' | 'publicHolidays'
>): void {
  saveEmployees(data.employees);
  saveLeaveRecords(data.leaveRecords);
  savePayrollRuns(data.payrollRuns);
  savePayItems(data.payItems);
  saveBonusPackages(data.bonusPackages);
  savePublicHolidays(data.publicHolidays);
}

/** Load full app cache from localStorage (instant first paint / offline viewing). */
export function loadAppData(): AppData {
  return {
    transactions: loadTransactions(),
    ...loadPayrollData(),
  };
}

/** Persist full app cache to localStorage (mirrors syncAllFromSupabase local writes). */
export function saveAppData(data: AppData): void {
  saveTransactions(data.transactions);
  savePayrollData(data);
}

/** Legacy loadData equivalent — transactions + restores LLM from storage. */
export function loadData(): { transactions: Transaction[]; llm: LLMSettings } {
  return {
    transactions: loadTransactions(),
    llm: loadLLMSettings(),
  };
}

export function saveData(transactions: Transaction[]): void {
  saveTransactions(transactions);
}
