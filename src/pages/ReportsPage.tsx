import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { MONTH_NAMES } from '../lib/config';
import { fmt, fmtSigned } from '../lib/format';

export default function ReportsPage() {
  const { transactions } = useApp();
  const now = new Date();
  const thisYear = now.getFullYear();

  const years = useMemo(() => {
    const ys = [...new Set(transactions.map((t) => t.date.slice(0, 4)))].sort().reverse();
    if (!ys.includes(String(thisYear))) ys.unshift(String(thisYear));
    return ys;
  }, [transactions, thisYear]);

  const catOptions = useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort(),
    [transactions],
  );

  const [year, setYear] = useState(String(thisYear));
  const [month, setMonth] = useState(0);
  const [cat, setCat] = useState('');

  const data = useMemo(() => {
    const y = parseInt(year);
    let txs = transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      if (d.getFullYear() !== y) return false;
      if (month !== 0 && d.getMonth() + 1 !== month) return false;
      if (cat && t.category !== cat) return false;
      return true;
    });

    const income = txs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const profit = income - expenses;

    const incCats: Record<string, number> = {};
    txs.filter((t) => t.type === 'credit').forEach((t) => {
      incCats[t.category] = (incCats[t.category] || 0) + t.amount;
    });
    const incRows = Object.entries(incCats).sort((a, b) => b[1] - a[1]);

    const expCats: Record<string, number> = {};
    txs.filter((t) => t.type === 'debit').forEach((t) => {
      expCats[t.category] = (expCats[t.category] || 0) + t.amount;
    });
    const expRows = Object.entries(expCats).sort((a, b) => b[1] - a[1]);

    const monthly: Record<number, { in: number; out: number }> = {};
    transactions
      .filter((t) => {
        const d = new Date(t.date + 'T00:00:00');
        if (d.getFullYear() !== y) return false;
        if (cat && t.category !== cat) return false;
        return true;
      })
      .forEach((t) => {
        const m = new Date(t.date + 'T00:00:00').getMonth();
        if (!monthly[m]) monthly[m] = { in: 0, out: 0 };
        if (t.type === 'credit') monthly[m].in += t.amount;
        else monthly[m].out += t.amount;
      });
    const allMonths = Object.keys(monthly)
      .map(Number)
      .sort((a, b) => a - b);

    return { income, expenses, profit, incRows, expRows, monthly, allMonths };
  }, [transactions, year, month, cat]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Reports & P&L</h2>
          <div className="sub">Profit & Loss statement and detailed breakdowns</div>
        </div>
        <div className="filter-group">
          <label>Year:</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <label>Month:</label>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            <option value={0}>Full Year</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <label>Category:</label>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All Categories</option>
            {catOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="card">
          <div className="label">Total Revenue</div>
          <div className="value credit">{fmt(data.income)}</div>
        </div>
        <div className="card">
          <div className="label">Total Expenses</div>
          <div className="value debit">{fmt(data.expenses)}</div>
        </div>
        <div className="card">
          <div className="label">Net Profit / Loss</div>
          <div className="value profit" style={{ color: data.profit >= 0 ? 'var(--credit)' : 'var(--debit)' }}>
            {fmt(data.profit)}
          </div>
        </div>
      </div>

      <div className="cat-grid">
        <div className="table-wrap">
          <div className="table-header">
            <h3>Income Breakdown</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {!data.incRows.length ? (
                <tr>
                  <td colSpan={3} className="empty">
                    No income data
                  </td>
                </tr>
              ) : (
                data.incRows.map(([c, a]) => (
                  <tr key={c}>
                    <td>
                      <span className="cat-badge">{c}</span>
                    </td>
                    <td style={{ color: 'var(--credit)' }}>{fmt(a)}</td>
                    <td style={{ color: 'var(--muted)' }}>
                      {data.income ? ((a / data.income) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <div className="table-header">
            <h3>Expense Breakdown</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {!data.expRows.length ? (
                <tr>
                  <td colSpan={3} className="empty">
                    No expense data
                  </td>
                </tr>
              ) : (
                data.expRows.map(([c, a]) => (
                  <tr key={c}>
                    <td>
                      <span className="cat-badge">{c}</span>
                    </td>
                    <td style={{ color: 'var(--debit)' }}>{fmt(a)}</td>
                    <td style={{ color: 'var(--muted)' }}>
                      {data.expenses ? ((a / data.expenses) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <div className="table-header">
          <h3>Monthly Summary</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {!data.allMonths.length ? (
              <tr>
                <td colSpan={4} className="empty">
                  No data for this period
                </td>
              </tr>
            ) : (
              data.allMonths.map((m) => {
                const n = data.monthly[m].in - data.monthly[m].out;
                return (
                  <tr key={m}>
                    <td>{MONTH_NAMES[m]}</td>
                    <td style={{ color: 'var(--credit)' }}>{fmt(data.monthly[m].in)}</td>
                    <td style={{ color: 'var(--debit)' }}>{fmt(data.monthly[m].out)}</td>
                    <td style={{ color: n >= 0 ? 'var(--credit)' : 'var(--debit)', fontWeight: 600 }}>
                      {fmtSigned(n)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
