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
  created_at    timestamptz default now()
);

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

-- ============================================================
-- Row Level Security (RLS)
-- For a single-company private app using the anon key,
-- we allow all operations. Restrict further in production.
-- ============================================================
alter table transactions  enable row level security;
alter table employees     enable row level security;
alter table leave_records enable row level security;
alter table payroll_runs  enable row level security;

create policy "Allow all on transactions"  on transactions  for all using (true) with check (true);
create policy "Allow all on employees"     on employees     for all using (true) with check (true);
create policy "Allow all on leave_records" on leave_records for all using (true) with check (true);
create policy "Allow all on payroll_runs"  on payroll_runs  for all using (true) with check (true);

-- ============================================================
-- Indexes for common queries
-- ============================================================
create index if not exists idx_tx_date      on transactions(date desc);
create index if not exists idx_tx_type      on transactions(type);
create index if not exists idx_leave_emp    on leave_records(employee_id);
create index if not exists idx_payrun_month on payroll_runs(year desc, month desc);
