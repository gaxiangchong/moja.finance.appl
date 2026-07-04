import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { addCategory as addCategoryLib, loadCategories } from '../lib/categories';
import { PROVIDER_DEFAULTS, SB_TABLES, SUPABASE_KEY, SUPABASE_URL } from '../lib/config';
import { MONTHS } from '../lib/format';
import {
  applyProviderDefaults,
  getLLMConfig,
  saveLLMSettings as persistLLMSettings,
  testLLMConnection,
} from '../lib/llm';
import {
  toEmp,
  toEmpRow,
  toHoliday,
  toHolidayRow,
  toLeave,
  toLeaveRow,
  toPackage,
  toPackageRow,
  toPayItem,
  toPayItemRow,
  toRun,
  toRunRow,
  toTx,
  toTxRow,
} from '../lib/mappers';
import {
  finalizePayrollRun,
  generatePayrollEntries,
  updateCompanySalesInRun,
  updatePayrollEntry,
} from '../lib/payroll';
import {
  loadBonusPackages,
  loadEmployees,
  loadLeaveRecords,
  loadLLMSettings,
  loadPayItems,
  loadPayrollRuns,
  loadPublicHolidays,
  loadSupabaseConfig,
  loadTransactions,
  savePayrollData,
  saveSupabaseConfig,
  saveTransactions,
} from '../lib/storage';
import { probeSupabaseTables } from '../lib/supabase';
import { sanitiseSbUrl, uid } from '../lib/utils';
import type {
  BonusPackage,
  Employee,
  LeaveRecord,
  LLMSettings,
  PayItem,
  PayrollEntry,
  PayrollRun,
  PublicHoliday,
  SyncStatus,
  Transaction,
  TransactionRow,
  EmployeeRow,
  LeaveRecordRow,
  PayrollRunRow,
  PublicHolidayRow,
  PayItemRow,
  BonusPackageRow,
} from '../lib/types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

interface AppContextValue {
  transactions: Transaction[];
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  payrollRuns: PayrollRun[];
  payItems: PayItem[];
  bonusPackages: BonusPackage[];
  publicHolidays: PublicHoliday[];
  categories: string[];
  llmSettings: LLMSettings;
  sbUrl: string;
  sbKey: string;
  session: Session | null;
  syncStatus: SyncStatus;
  syncDetail: string;
  toast: ToastState;
  canWrite: boolean;
  draftPayroll: PayrollRun | null;
  llmTestStatus: string;

  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  initSupabase: () => void;
  connectSupabase: () => Promise<void>;
  syncAll: () => Promise<void>;
  resync: () => Promise<void>;
  diag: () => Promise<void>;
  saveLLMSettings: (settings: Partial<LLMSettings>) => void;
  onProviderChange: (provider: LLMSettings['provider'], restoring?: boolean) => void;
  testLLM: () => Promise<void>;
  saveSbConfigFromInputs: (url: string, key: string) => void;

  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<boolean>;
  importTransactions: (txs: Omit<Transaction, 'id'>[]) => Promise<boolean>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  deleteTransactions: (ids: string[]) => Promise<boolean>;
  addCategory: (name: string) => boolean;

  saveEmployee: (data: Partial<Employee> & { name: string; basicSalary: number; joinDate: string }, id?: string) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  saveLeave: (data: Omit<LeaveRecord, 'id' | 'days'> & { days: number }) => Promise<boolean>;
  deleteLeave: (id: string) => Promise<boolean>;
  saveHoliday: (data: Omit<PublicHoliday, 'id'>, id?: string) => Promise<boolean>;
  deleteHoliday: (id: string) => Promise<boolean>;
  savePayItem: (data: Omit<PayItem, 'id'>) => Promise<boolean>;
  deletePayItem: (id: string) => Promise<boolean>;
  savePackage: (data: BonusPackage) => Promise<boolean>;
  deletePackage: (id: string) => Promise<boolean>;

  generatePayroll: (month: number, year: number) => string | null;
  updatePayEntry: (index: number, field: keyof PayrollEntry, value: number) => void;
  updateCompanySales: (sales: number) => void;
  finalizePayroll: (runId: string) => Promise<boolean>;
  setDraftPayroll: (run: PayrollRun | null) => void;

  showToast: (message: string, type?: ToastState['type']) => void;
  exportCSV: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const sbRef = useRef<SupabaseClient | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [employees, setEmployees] = useState<Employee[]>(() => loadEmployees());
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>(() => loadLeaveRecords());
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(() => loadPayrollRuns());
  const [payItems, setPayItems] = useState<PayItem[]>(() => loadPayItems());
  const [bonusPackages, setBonusPackages] = useState<BonusPackage[]>(() => loadBonusPackages());
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>(() => loadPublicHolidays());
  const [categories, setCategories] = useState<string[]>(() => loadCategories());
  const [llmSettings, setLlmSettings] = useState<LLMSettings>(() => {
    const saved = loadLLMSettings();
    const d = PROVIDER_DEFAULTS[saved.provider];
    return {
      ...saved,
      model: saved.model || d.model,
      base: saved.base || d.base,
    };
  });
  const sbConfigInit = loadSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(sbConfigInit.url);
  const [sbKey, setSbKey] = useState(sbConfigInit.key);
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [syncDetail, setSyncDetail] = useState('Local only');
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const [draftPayroll, setDraftPayroll] = useState<PayrollRun | null>(null);
  const [llmTestStatus, setLlmTestStatus] = useState('');

  const canWrite = !!(sbRef.current && session);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const persistPayroll = useCallback(
    (next: {
      employees?: Employee[];
      leaveRecords?: LeaveRecord[];
      payrollRuns?: PayrollRun[];
      payItems?: PayItem[];
      bonusPackages?: BonusPackage[];
      publicHolidays?: PublicHoliday[];
    }) => {
      savePayrollData({
        employees: next.employees ?? employees,
        leaveRecords: next.leaveRecords ?? leaveRecords,
        payrollRuns: next.payrollRuns ?? payrollRuns,
        payItems: next.payItems ?? payItems,
        bonusPackages: next.bonusPackages ?? bonusPackages,
        publicHolidays: next.publicHolidays ?? publicHolidays,
      });
    },
    [employees, leaveRecords, payrollRuns, payItems, bonusPackages, publicHolidays],
  );

  const sbUpsert = useCallback(async (table: string, row: object) => {
    if (!sbRef.current) throw new Error('Not connected');
    setSyncStatus('syncing');
    const { error } = await sbRef.current.from(table).upsert(row, { onConflict: 'id' });
    if (error) throw error;
    setSyncStatus('synced');
    setSyncDetail('Synced with Supabase');
  }, []);

  const sbUpsertBatch = useCallback(async (table: string, rows: object[]) => {
    if (!rows.length || !sbRef.current) return;
    setSyncStatus('syncing');
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await sbRef.current.from(table).upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    setSyncStatus('synced');
    setSyncDetail('Synced with Supabase');
  }, []);

  const sbDelete = useCallback(async (table: string, id: string) => {
    if (!sbRef.current) throw new Error('Not connected');
    setSyncStatus('syncing');
    const { error } = await sbRef.current.from(table).delete().eq('id', id);
    if (error) throw error;
    setSyncStatus('synced');
    setSyncDetail('Synced with Supabase');
  }, []);

  const persist = useCallback(
    async (serverFn: () => Promise<void>, commitFn: () => void, okMsg?: string): Promise<boolean> => {
      if (!sbRef.current || !session) {
        showToast('Read-only — connect to Supabase to make changes', 'error');
        return false;
      }
      try {
        await serverFn();
        commitFn();
        if (okMsg) showToast(okMsg, 'success');
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setSyncStatus('error');
        setSyncDetail(msg || 'Save failed');
        showToast('Not saved — ' + msg, 'error');
        return false;
      }
    },
    [session, showToast],
  );

  const syncAll = useCallback(async () => {
    if (!sbRef.current) {
      setSyncStatus('offline');
      setSyncDetail('Local only');
      return;
    }
    try {
      setSyncStatus('syncing');
      setSyncDetail('Syncing...');
      const [tx, emp, lv, pr, ph, pi, bp] = await Promise.all([
        sbRef.current.from('transactions').select('*').order('date', { ascending: false }),
        sbRef.current.from('employees').select('*').order('created_at'),
        sbRef.current.from('leave_records').select('*').order('created_at', { ascending: false }),
        sbRef.current.from('payroll_runs').select('*').order('year', { ascending: false }),
        sbRef.current.from('public_holidays').select('*').order('date'),
        sbRef.current.from('pay_items').select('*').order('created_at', { ascending: false }),
        sbRef.current.from('bonus_packages').select('*').order('created_at'),
      ]);
      const errors = [
        ['transactions', tx.error],
        ['employees', emp.error],
        ['leave_records', lv.error],
        ['payroll_runs', pr.error],
        ['public_holidays', ph.error],
        ['pay_items', pi.error],
        ['bonus_packages', bp.error],
      ].filter(([, err]) => err);
      if (errors.length) {
        throw new Error(errors.map(([t, e]) => `${t}: ${(e as { message: string }).message}`).join('; '));
      }
      const nextTx = (tx.data || []).map((r) => toTx(r as TransactionRow));
      const nextEmp = (emp.data || []).map((r) => toEmp(r as EmployeeRow));
      const nextLv = (lv.data || []).map((r) => toLeave(r as LeaveRecordRow));
      const nextPr = (pr.data || []).map((r) => toRun(r as PayrollRunRow));
      const nextPi = (pi.data || []).map((r) => toPayItem(r as PayItemRow));
      const nextBp = (bp.data || []).map((r) => toPackage(r as BonusPackageRow));
      const nextPh = ph.data?.length ? ph.data.map((r) => toHoliday(r as PublicHolidayRow)) : publicHolidays;

      setTransactions(nextTx);
      setEmployees(nextEmp);
      setLeaveRecords(nextLv);
      setPayrollRuns(nextPr);
      setPayItems(nextPi);
      setBonusPackages(nextBp);
      if (ph.data?.length) setPublicHolidays(nextPh);

      saveTransactions(nextTx);
      savePayrollData({
        employees: nextEmp,
        leaveRecords: nextLv,
        payrollRuns: nextPr,
        payItems: nextPi,
        bonusPackages: nextBp,
        publicHolidays: nextPh,
      });

      setSyncStatus('synced');
      setSyncDetail('Synced with Supabase');
      showToast('Synced from Supabase ✅', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncStatus('error');
      setSyncDetail('❌ ' + (msg || 'Sync failed'));
      showToast('Supabase error: ' + msg, 'error');
    }
  }, [publicHolidays, showToast]);

  const initSupabase = useCallback(() => {
    const url = sanitiseSbUrl(sbUrl || SUPABASE_URL);
    const key = sbKey || SUPABASE_KEY;
    sbRef.current = createClient(url, key);
  }, [sbUrl, sbKey]);

  const checkSession = useCallback(async () => {
    if (!sbRef.current) initSupabase();
    if (!sbRef.current) return;
    const { data: { session: s } } = await sbRef.current.auth.getSession();
    setSession(s);
    sbRef.current.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setSyncStatus('offline');
        setSyncDetail('Read-only — sign in to save');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(s);
      }
    });
  }, [initSupabase]);

  useEffect(() => {
    initSupabase();
    checkSession().then(() => {
      if (session) syncAll();
      else {
        setSyncStatus('offline');
        setSyncDetail('Read-only — sign in to save');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!sbRef.current) initSupabase();
      if (!sbRef.current) return 'Supabase not initialized';
      const { data, error } = await sbRef.current.auth.signInWithPassword({ email, password });
      if (error) return error.message;
      setSession(data.session);
      await syncAll();
      return null;
    },
    [initSupabase, syncAll],
  );

  const logout = useCallback(async () => {
    if (sbRef.current) await sbRef.current.auth.signOut();
    setSession(null);
    setSyncStatus('offline');
    setSyncDetail('Read-only — sign in to save');
  }, []);

  const connectSupabase = useCallback(async () => {
    const url = sanitiseSbUrl(sbUrl.trim());
    const key = sbKey.trim();
    if (!url || !key) {
      showToast('Enter Supabase URL and Anon Key', 'error');
      return;
    }
    setSbUrl(url);
    saveSupabaseConfig(url, key);
    sbRef.current = createClient(url, key);
    setSyncStatus('syncing');
    await syncAll();
  }, [sbUrl, sbKey, showToast, syncAll]);

  const resync = useCallback(async () => {
    if (!canWrite) {
      showToast('Sign in first — resync requires an authenticated Supabase session', 'error');
      return;
    }
    if (!sbRef.current) return;
    const probe = await probeSupabaseTables(sbRef.current);
    const missing = SB_TABLES.filter((t) => !probe[t].ok);
    if (missing.length) {
      showToast(`Missing tables: ${missing.join(', ')}. Run supabase_schema.sql first.`, 'error');
      return;
    }
    if (
      !confirm(
        `Push all local data to Supabase, then pull the latest copy?\n\nLocal: ${employees.length} employees, ${payItems.length} pay items, ${publicHolidays.length} holidays, ${bonusPackages.length} packages, ${leaveRecords.length} leave, ${payrollRuns.length} payroll runs, ${transactions.length} transactions`,
      )
    )
      return;

    setSyncStatus('syncing');
    setSyncDetail('Pushing local data…');
    const empIds = new Set(employees.map((e) => e.id));
    const validPayItems = payItems.filter((p) => empIds.has(p.employeeId));

    try {
      await sbUpsertBatch('employees', employees.map(toEmpRow));
      await sbUpsertBatch('bonus_packages', bonusPackages.map(toPackageRow));
      await sbUpsertBatch('public_holidays', publicHolidays.map(toHolidayRow));
      await sbUpsertBatch('pay_items', validPayItems.map(toPayItemRow));
      await sbUpsertBatch(
        'leave_records',
        leaveRecords.filter((l) => empIds.has(l.employeeId)).map(toLeaveRow),
      );
      await sbUpsertBatch('payroll_runs', payrollRuns.map(toRunRow));
      await sbUpsertBatch('transactions', transactions.map(toTxRow));
      if (validPayItems.length !== payItems.length) {
        setPayItems(validPayItems);
        persistPayroll({ payItems: validPayItems });
      }
      await syncAll();
      showToast('Resync complete', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncStatus('error');
      setSyncDetail(msg);
      showToast('Resync failed: ' + msg, 'error');
    }
  }, [
    canWrite,
    employees,
    payItems,
    publicHolidays,
    bonusPackages,
    leaveRecords,
    payrollRuns,
    transactions,
    showToast,
    sbUpsertBatch,
    syncAll,
    persistPayroll,
  ]);

  const diag = useCallback(async () => {
    const url = sanitiseSbUrl(sbUrl.trim());
    const key = sbKey.trim();
    if (!url || !key) {
      showToast('Enter URL and Key first', 'error');
      return;
    }
    const client = createClient(url, key);
    const lines = [`URL: ${url}`, `Key: ${key.slice(0, 20)}...`, ''];
    const probe = await probeSupabaseTables(client);
    let allOk = true;
    for (const table of SB_TABLES) {
      const r = probe[table];
      if (!r.ok) {
        lines.push(`❌ "${table}": ${r.error} (code: ${r.code})`);
        allOk = false;
      } else {
        lines.push(`✅ "${table}" — ${r.count} row(s) in Supabase`);
      }
    }
    const empIds = new Set(employees.map((e) => e.id));
    const orphanPayItems = payItems.filter((p) => !empIds.has(p.employeeId));
    lines.push('');
    lines.push('Local cache:');
    lines.push(
      `  employees: ${employees.length}, pay_items: ${payItems.length}, holidays: ${publicHolidays.length}, packages: ${bonusPackages.length}`,
    );
    if (orphanPayItems.length) {
      lines.push(`  ⚠ ${orphanPayItems.length} pay item(s) reference missing employee IDs`);
    }
    alert(lines.join('\n'));
    if (!allOk) {
      const missing = SB_TABLES.filter((t) => !probe[t].ok);
      showToast(`Tables missing: ${missing.join(', ')} — run supabase_schema.sql first`, 'error');
    }
  }, [sbUrl, sbKey, employees, payItems, publicHolidays, bonusPackages, showToast]);

  const saveLLMSettings = useCallback((partial: Partial<LLMSettings>) => {
    setLlmSettings((prev) => {
      const next = { ...prev, ...partial };
      persistLLMSettings(next);
      return next;
    });
  }, []);

  const onProviderChange = useCallback((provider: LLMSettings['provider'], restoring = false) => {
    setLlmSettings((prev) => {
      const next = restoring
        ? { ...prev, provider }
        : applyProviderDefaults(provider, prev);
      persistLLMSettings(next);
      return next;
    });
  }, []);

  const testLLM = useCallback(async () => {
    setLlmTestStatus('Testing…');
    const result = await testLLMConnection(getLLMConfig(llmSettings));
    if (result.ok) setLlmTestStatus('✔ Connected');
    else setLlmTestStatus('✘ ' + result.message.slice(0, 40));
  }, [llmSettings]);

  const saveSbConfigFromInputs = useCallback((url: string, key: string) => {
    const clean = sanitiseSbUrl(url);
    setSbUrl(clean);
    setSbKey(key.trim());
    saveSupabaseConfig(clean, key.trim());
  }, []);

  const addCategory = useCallback(
    (name: string) => {
      const result = addCategoryLib(categories, name);
      setCategories(result.categories);
      if (!result.ok) {
        if (result.reason === 'duplicate') showToast('Category already exists', 'error');
        return false;
      }
      showToast(`Category "${name.trim()}" added`, 'success');
      return true;
    },
    [categories, showToast],
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>) => {
      const newTx = { ...tx, id: uid() };
      return persist(
        () => sbUpsert('transactions', toTxRow(newTx)),
        () => {
          setTransactions((prev) => {
            const next = [...prev, newTx];
            saveTransactions(next);
            return next;
          });
        },
        'Transaction saved!',
      );
    },
    [persist, sbUpsert],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      const tx = transactions.find((t) => t.id === id);
      if (!tx) return Promise.resolve(false);
      const updated = { ...tx, ...patch };
      return persist(
        () => sbUpsert('transactions', toTxRow(updated)),
        () => {
          setTransactions((prev) => {
            const next = prev.map((t) => (t.id === id ? updated : t));
            saveTransactions(next);
            return next;
          });
        },
        'Transaction updated',
      );
    },
    [transactions, persist, sbUpsert],
  );

  const deleteTransaction = useCallback(
    (id: string) =>
      persist(
        () => sbDelete('transactions', id),
        () => {
          setTransactions((prev) => {
            const next = prev.filter((t) => t.id !== id);
            saveTransactions(next);
            return next;
          });
        },
        'Transaction deleted',
      ),
    [persist, sbDelete],
  );

  const deleteTransactions = useCallback(
    (ids: string[]) =>
      persist(
        async () => {
          if (!sbRef.current) throw new Error('Not connected');
          setSyncStatus('syncing');
          const { error } = await sbRef.current.from('transactions').delete().in('id', ids);
          if (error) throw error;
          setSyncStatus('synced');
        },
        () => {
          setTransactions((prev) => {
            const next = prev.filter((t) => !ids.includes(t.id));
            saveTransactions(next);
            return next;
          });
        },
        `Deleted ${ids.length} transaction(s)`,
      ),
    [persist],
  );

  const importTransactions = useCallback(
    (txs: Omit<Transaction, 'id'>[]) => {
      const newTxs = txs.map((t) => ({ ...t, id: uid() }));
      return persist(
        () => sbUpsertBatch('transactions', newTxs.map(toTxRow)),
        () => {
          setTransactions((prev) => {
            const next = [...prev, ...newTxs];
            saveTransactions(next);
            return next;
          });
        },
        `Imported ${newTxs.length} transaction(s)`,
      );
    },
    [persist, sbUpsertBatch],
  );

  const saveEmployee = useCallback(
    (data: Partial<Employee> & { name: string; basicSalary: number; joinDate: string }, id?: string) => {
      const idx = id ? employees.findIndex((e) => e.id === id) : -1;
      const savedEmp: Employee = id
        ? { ...employees[idx], ...data, id }
        : {
            id: uid(),
            employeeId: '',
            ic: '',
            position: '',
            department: '',
            workDays: 5,
            dailyHours: 8,
            residency: 'resident',
            marital: 'single',
            children: 0,
            epfNo: '',
            socsoNo: '',
            taxNo: '',
            bank: '',
            bankAcc: '',
            status: 'active',
            endDate: '',
            packageId: '',
            restDays: '0',
            ...data,
          };
      return persist(
        () => sbUpsert('employees', toEmpRow(savedEmp)),
        () => {
          setEmployees((prev) => {
            const next = idx >= 0 ? prev.map((e, i) => (i === idx ? savedEmp : e)) : [...prev, savedEmp];
            persistPayroll({ employees: next });
            return next;
          });
        },
        'Employee saved',
      );
    },
    [employees, persist, sbUpsert, persistPayroll],
  );

  const deleteEmployee = useCallback(
    (id: string) =>
      persist(
        () => sbDelete('employees', id),
        () => {
          setEmployees((prev) => {
            const next = prev.filter((e) => e.id !== id);
            persistPayroll({ employees: next });
            return next;
          });
        },
        'Employee deleted',
      ),
    [persist, sbDelete, persistPayroll],
  );

  const saveLeave = useCallback(
    (data: Omit<LeaveRecord, 'id'>) => {
      const newLeave = { ...data, id: uid() };
      return persist(
        () => sbUpsert('leave_records', toLeaveRow(newLeave)),
        () => {
          setLeaveRecords((prev) => {
            const next = [...prev, newLeave];
            persistPayroll({ leaveRecords: next });
            return next;
          });
        },
        `${data.days} working day(s) leave recorded`,
      );
    },
    [persist, sbUpsert, persistPayroll],
  );

  const deleteLeave = useCallback(
    (id: string) =>
      persist(
        () => sbDelete('leave_records', id),
        () => {
          setLeaveRecords((prev) => {
            const next = prev.filter((r) => r.id !== id);
            persistPayroll({ leaveRecords: next });
            return next;
          });
        },
        'Leave removed',
      ),
    [persist, sbDelete, persistPayroll],
  );

  const saveHoliday = useCallback(
    (data: Omit<PublicHoliday, 'id'>, id?: string) => {
      const holiday: PublicHoliday = { ...data, id: id || uid() };
      return persist(
        () => sbUpsert('public_holidays', toHolidayRow(holiday)),
        () => {
          setPublicHolidays((prev) => {
            const next = id ? prev.map((h) => (h.id === id ? holiday : h)) : [...prev, holiday];
            persistPayroll({ publicHolidays: next });
            return next;
          });
        },
        'Holiday saved',
      );
    },
    [persist, sbUpsert, persistPayroll],
  );

  const deleteHoliday = useCallback(
    (id: string) =>
      persist(
        () => sbDelete('public_holidays', id),
        () => {
          setPublicHolidays((prev) => {
            const next = prev.filter((h) => h.id !== id);
            persistPayroll({ publicHolidays: next });
            return next;
          });
        },
        'Holiday removed',
      ),
    [persist, sbDelete, persistPayroll],
  );

  const savePayItem = useCallback(
    (data: Omit<PayItem, 'id'>) => {
      const item = { ...data, id: uid() };
      return persist(
        () => sbUpsert('pay_items', toPayItemRow(item)),
        () => {
          setPayItems((prev) => {
            const next = [...prev, item];
            persistPayroll({ payItems: next });
            return next;
          });
        },
        'Pay item saved',
      );
    },
    [persist, sbUpsert, persistPayroll],
  );

  const deletePayItem = useCallback(
    (id: string) =>
      persist(
        () => sbDelete('pay_items', id),
        () => {
          setPayItems((prev) => {
            const next = prev.filter((p) => p.id !== id);
            persistPayroll({ payItems: next });
            return next;
          });
        },
        'Pay item removed',
      ),
    [persist, sbDelete, persistPayroll],
  );

  const savePackage = useCallback(
    (data: BonusPackage) =>
      persist(
        () => sbUpsert('bonus_packages', toPackageRow(data)),
        () => {
          setBonusPackages((prev) => {
            const idx = prev.findIndex((p) => p.id === data.id);
            const next = idx >= 0 ? prev.map((p, i) => (i === idx ? data : p)) : [...prev, data];
            persistPayroll({ bonusPackages: next });
            return next;
          });
        },
        'Package saved',
      ),
    [persist, sbUpsert, persistPayroll],
  );

  const deletePackage = useCallback(
    (id: string) =>
      persist(
        () => sbDelete('bonus_packages', id),
        () => {
          setBonusPackages((prev) => {
            const next = prev.filter((p) => p.id !== id);
            persistPayroll({ bonusPackages: next });
            return next;
          });
          setEmployees((prev) => {
            const next = prev.map((e) => (e.packageId === id ? { ...e, packageId: '' } : e));
            persistPayroll({ employees: next });
            return next;
          });
        },
        'Package removed',
      ),
    [persist, sbDelete, persistPayroll],
  );

  const generatePayroll = useCallback(
    (month: number, year: number): string | null => {
      const result = generatePayrollEntries({
        month,
        year,
        employees,
        leaveRecords,
        payItems,
        bonusPackages,
        publicHolidays,
        transactions,
        payrollRuns,
        prevDraft: draftPayroll,
      });
      if (result.error) {
        showToast(result.error, 'error');
        return result.error;
      }
      setDraftPayroll(result.run!);
      return null;
    },
    [employees, leaveRecords, payItems, bonusPackages, publicHolidays, transactions, payrollRuns, draftPayroll, showToast],
  );

  const updatePayEntry = useCallback(
    (index: number, field: keyof PayrollEntry, value: number) => {
      if (!draftPayroll) return;
      const entry = draftPayroll.entries[index];
      const emp = employees.find((e) => e.id === entry.employeeId);
      if (!emp) return;
      const updated = updatePayrollEntry(
        entry,
        emp,
        draftPayroll.year,
        draftPayroll.month,
        payItems,
        publicHolidays,
        draftPayroll.companySales || 0,
        bonusPackages,
        field as 'basicSalary' | 'commission' | 'sopScore' | 'units',
        value,
      );
      const entries = [...draftPayroll.entries];
      entries[index] = updated;
      setDraftPayroll({ ...draftPayroll, entries });
    },
    [draftPayroll, employees, payItems, publicHolidays, bonusPackages],
  );

  const updateCompanySales = useCallback(
    (sales: number) => {
      if (!draftPayroll) return;
      setDraftPayroll(updateCompanySalesInRun(draftPayroll, sales, employees, bonusPackages));
    },
    [draftPayroll, employees, bonusPackages],
  );

  const finalizePayroll = useCallback(
    (runId: string) => {
      if (!draftPayroll || draftPayroll.id !== runId) return Promise.resolve(false);
      const { run: final, transactions: newTxs } = finalizePayrollRun(draftPayroll);
      return persist(
        async () => {
          await sbUpsert('payroll_runs', toRunRow(final));
          await sbUpsertBatch('transactions', newTxs.map(toTxRow));
        },
        () => {
          setPayrollRuns((prev) => {
            const filtered = prev.filter((r) => !(r.month === final.month && r.year === final.year));
            const next = [...filtered, final];
            persistPayroll({ payrollRuns: next });
            return next;
          });
          setTransactions((prev) => {
            const next = [...prev, ...newTxs];
            saveTransactions(next);
            return next;
          });
          setDraftPayroll(final);
        },
        `Payroll finalized & posted to expenses`,
      );
    },
    [draftPayroll, persist, sbUpsert, sbUpsertBatch, persistPayroll],
  );

  const exportCSV = useCallback(() => {
    if (!transactions.length) {
      showToast('No transactions to export', 'error');
      return;
    }
    const headers = ['Date', 'Description', 'Account', 'Category', 'Payment Class', 'Staff Name', 'Type', 'Amount', 'Reference', 'Notes'];
    const rows = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).map((t) => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.account || '',
      t.category,
      t.paymentClass === 'reimbursement' ? 'Reimbursement to Staff' : 'Bill to Company',
      t.staffName || '',
      t.type,
      t.amount.toFixed(2),
      t.ref || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moja_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
  }, [transactions, showToast]);

  const value: AppContextValue = {
    transactions,
    employees,
    leaveRecords,
    payrollRuns,
    payItems,
    bonusPackages,
    publicHolidays,
    categories,
    llmSettings,
    sbUrl,
    sbKey,
    session,
    syncStatus,
    syncDetail,
    toast,
    canWrite,
    draftPayroll,
    llmTestStatus,
    login,
    logout,
    checkSession,
    initSupabase,
    connectSupabase,
    syncAll,
    resync,
    diag,
    saveLLMSettings,
    onProviderChange,
    testLLM,
    saveSbConfigFromInputs,
    addTransaction,
    importTransactions,
    updateTransaction,
    deleteTransaction,
    deleteTransactions,
    addCategory,
    saveEmployee,
    deleteEmployee,
    saveLeave,
    deleteLeave,
    saveHoliday,
    deleteHoliday,
    savePayItem,
    deletePayItem,
    savePackage,
    deletePackage,
    generatePayroll,
    updatePayEntry,
    updateCompanySales,
    finalizePayroll,
    setDraftPayroll,
    showToast,
    exportCSV,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { MONTHS };
