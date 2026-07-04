import type { LLMProvider, ProviderDefaults, PublicHolidaySeed } from './types';
import { envSupabaseAnonKey, envSupabaseUrl } from './env';

export const SUPABASE_URL = envSupabaseUrl();
export const SUPABASE_KEY = envSupabaseAnonKey();
export const PROVIDER_DEFAULTS: Record<LLMProvider, ProviderDefaults> = {
  claude: { base: 'https://api.anthropic.com', model: 'claude-opus-4-5', keyRequired: true },
  ollama: { base: 'http://localhost:11434', model: 'qwen2-vl', keyRequired: false },
  lmstudio: { base: 'http://localhost:1234', model: 'qwen2-vl', keyRequired: false },
  'openai-compat': { base: 'http://localhost:8080', model: '', keyRequired: false },
};

export const JOHOR_PH_2026: PublicHolidaySeed[] = [
  { date: '2026-01-01', name: "New Year's Day", type: 'Federal' },
  { date: '2026-01-22', name: 'Hol Almarhum Sultan Iskandar', type: 'Johor' },
  { date: '2026-01-27', name: 'Israk Mikraj 1447H', type: 'Johor' },
  { date: '2026-02-17', name: 'Chinese New Year', type: 'Federal' },
  { date: '2026-02-18', name: 'Chinese New Year (2nd Day)', type: 'Federal' },
  { date: '2026-03-06', name: 'Nuzul Al-Quran 1447H', type: 'Johor' },
  { date: '2026-03-20', name: 'Hari Raya Aidilfitri', type: 'Federal' },
  { date: '2026-03-21', name: 'Hari Raya Aidilfitri (2nd Day)', type: 'Federal' },
  { date: '2026-03-23', name: "Sultan of Johor's Birthday", type: 'Johor' },
  { date: '2026-05-01', name: 'Labour Day', type: 'Federal' },
  { date: '2026-05-05', name: 'Wesak Day', type: 'Federal' },
  { date: '2026-05-27', name: 'Hari Raya Aidiladha', type: 'Federal' },
  { date: '2026-06-06', name: "Agong's Birthday", type: 'Federal' },
  { date: '2026-07-18', name: 'Awal Muharram 1448H', type: 'Federal' },
  { date: '2026-08-31', name: 'National Day', type: 'Federal' },
  { date: '2026-09-15', name: "Maulidur Rasul (Prophet's Birthday)", type: 'Federal' },
  { date: '2026-09-16', name: 'Malaysia Day', type: 'Federal' },
  { date: '2026-10-20', name: 'Deepavali', type: 'Federal' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'Federal' },
];

export const DEFAULT_CATS = [
  'Salary/Payroll', 'Sales Revenue', 'Rent/Lease', 'Utilities',
  'Ingredient - Hot Kitchen', 'Ingredient - Cake Kitchen', 'Drinks & Beverages Ingredient',
  'General Supplies', 'Equipment', 'Construction', 'Facility',
  'Supplies', 'Marketing', 'Travel', 'Software/SaaS', 'Professional Services',
  'Insurance', 'Taxes', 'Meals/Entertainment', 'Bank Fees', 'Startup Cost', 'Misc', 'Other',
];

export const SB_TABLES = [
  'transactions',
  'employees',
  'leave_records',
  'payroll_runs',
  'public_holidays',
  'pay_items',
  'bonus_packages',
] as const;

export type SbTable = (typeof SB_TABLES)[number];

/** Short month names (Jan, Feb, …) */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Index-aligned month names — index 0 is empty string for 1-based month numbers */
export const PI_MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
