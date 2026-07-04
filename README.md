# Moja Finance Agent

React + TypeScript web app for finance tracking, AI receipt import, and Malaysia payroll (EPF, SOCSO, EIS, PCB).

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build for production

```bash
npm run build
npm run preview
```

## Stack

- **React 19** + **TypeScript** + **Vite**
- **React Router** for navigation
- **Supabase** for auth and cloud sync
- **localStorage** offline cache

## Project structure

```
src/
  components/   Layout, Sidebar, Login, Modal, Toast
  context/      AppContext — global state & Supabase sync
  lib/          Business logic (payroll, LLM, mappers, storage)
  pages/        Dashboard, Ledger, Upload, Payroll, etc.
legacy/
  index.html    Original single-file app (reference)
```

## Features (parity with legacy app)

- Dashboard with MTD/YTD and category breakdown
- Transaction ledger with filters, bulk delete, CSV export
- AI upload/import (Claude, Ollama, LM Studio)
- Manual transaction entry
- Reports & P&L
- Employees, leave, public holidays (editable rates)
- Pay items (allowance, claim, OT, PH)
- Bonus packages (SOP, per-unit, company tiers)
- Run payroll with pro-ration, statutory deductions, payslips
- Pay history

## Supabase

Run `supabase_schema.sql` in your Supabase SQL Editor. Sign in via the login screen to enable writes and sync.

## Environment

Copy `.env.example` to `.env` and set your keys (`.env` is gitignored):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `VITE_LLM_API_KEY` | Claude (or other LLM) API key for AI upload |

These pre-fill the sidebar on startup. Values saved in the UI override env until you clear localStorage.

```bash
cp .env.example .env
# edit .env with your keys
```

Restart the dev server after changing `.env`.
