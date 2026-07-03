-- ============================================================
-- Moja Finance Agent — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. TRANSACTIONS
create table if not exists transactions (
  id            text primary key,
  date          text not null,
  amount        numeric(15,2) not null,
  type          text not null check (type in ('debit','credit')),
  account       text,
  description   text,
  category      text,
  payment_class text default 'bill',
  staff_name    text,
  ref           text,
  notes         text,
  source        text,
  created_at    timestamptz default now()
);

-- 2. EMPLOYEES
create table if not exists employees (
  id            text primary key,
  name          text not null,
  employee_id   text,
  ic            text,
  position      text,
  department    text,
  join_date     text,
  basic_salary  numeric(15,2),
  work_days     numeric(4,1) default 5,
  daily_hours   integer default 8,
  residency     text default 'resident',
  marital       text default 'single',
  children      integer default 0,
  epf_no        text,
  socso_no      text,
  tax_no        text,
  bank          text,
  bank_acc      text,
  status        text default 'active',
  end_date      text,
  package_id    text,
  rest_days     text,               -- weekly rest days as CSV weekday indices (0=Sun … 6=Sat)
  created_at    timestamptz default now()
);
-- Backfill for existing installations (safe to re-run):
alter table employees add column if not exists end_date   text;
alter table employees add column if not exists package_id text;
alter table employees add column if not exists rest_days  text;

-- 3. LEAVE RECORDS
create table if not exists leave_records (
  id            text primary key,
  employee_id   text references employees(id) on delete cascade,
  type          text not null,
  from_date     text not null,
  to_date       text not null,
  days          integer default 0,
  status        text default 'pending',
  reason        text,
  created_at    timestamptz default now()
);

-- 4. PAYROLL RUNS (entries stored as JSONB)
create table if not exists payroll_runs (
  id              text primary key,
  month           integer not null,
  year            integer not null,
  status          text default 'draft',
  processed_date  text,
  total_gross     numeric(15,2),
  total_net       numeric(15,2),
  total_cost      numeric(15,2),
  entries         jsonb,
  created_at      timestamptz default now()
);

-- 5. PUBLIC HOLIDAYS (user-editable; rate = OT multiplier if worked)
create table if not exists public_holidays (
  id            text primary key,
  date          text not null,
  name          text not null,
  type          text default 'Federal',
  rate          numeric(3,1) default 1.5,
  created_at    timestamptz default now()
);

-- 6. PAY ITEMS (per-employee per-month: allowance, claim, overtime, PH)
create table if not exists pay_items (
  id           text primary key,
  employee_id  text references employees(id) on delete cascade,
  month        integer not null,
  year         integer not null,
  type         text not null check (type in ('allowance','claim','overtime','ph')),
  label        text,
  ot_type      text,                 -- weekday | restday | holiday (overtime only)
  hours        numeric(6,2),         -- overtime only
  ph_days      integer,              -- ph only
  amount       numeric(15,2),        -- entered (allowance/claim) or computed (ot/ph) snapshot
  notes        text,
  created_at   timestamptz default now()
);

-- 7. BONUS PACKAGES (admin-configurable compensation plans)
create table if not exists bonus_packages (
  id               text primary key,
  name             text not null,
  sop_enabled      boolean default false,
  sop_tiers        jsonb,              -- [{minScore, amount}] matched highest-first
  perunit_enabled  boolean default false,
  perunit_label    text,               -- e.g. 'Bento'
  perunit_rate     numeric(15,2),      -- RM per unit
  company_enabled  boolean default false,
  company_tiers    jsonb,              -- [{minSales, amount}] matched highest-first
  created_at       timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- For a single-company private app using the anon key,
-- we allow all operations. Restrict further in production.
-- ============================================================
alter table transactions    enable row level security;
alter table employees       enable row level security;
alter table leave_records   enable row level security;
alter table payroll_runs    enable row level security;
alter table public_holidays enable row level security;
alter table pay_items       enable row level security;
alter table bonus_packages  enable row level security;

-- Policies (drop first so script is safe to re-run)
drop policy if exists "Allow all on transactions"    on transactions;
drop policy if exists "Allow all on employees"       on employees;
drop policy if exists "Allow all on leave_records"   on leave_records;
drop policy if exists "Allow all on payroll_runs"    on payroll_runs;
drop policy if exists "Allow all on public_holidays" on public_holidays;
drop policy if exists "Allow all on pay_items"       on pay_items;
drop policy if exists "Allow all on bonus_packages"  on bonus_packages;

create policy "Allow all on transactions"    on transactions    for all using (true) with check (true);
create policy "Allow all on employees"       on employees       for all using (true) with check (true);
create policy "Allow all on leave_records"   on leave_records   for all using (true) with check (true);
create policy "Allow all on payroll_runs"    on payroll_runs    for all using (true) with check (true);
create policy "Allow all on public_holidays" on public_holidays for all using (true) with check (true);
create policy "Allow all on pay_items"       on pay_items       for all using (true) with check (true);
create policy "Allow all on bonus_packages"  on bonus_packages  for all using (true) with check (true);

-- ============================================================
-- Indexes for common queries
-- ============================================================
create index if not exists idx_tx_date      on transactions(date desc);
create index if not exists idx_tx_type      on transactions(type);
create index if not exists idx_leave_emp    on leave_records(employee_id);
create index if not exists idx_payrun_month on payroll_runs(year desc, month desc);
create index if not exists idx_holiday_date on public_holidays(date);
create index if not exists idx_payitem_period on pay_items(year desc, month desc);
create index if not exists idx_payitem_emp    on pay_items(employee_id);
