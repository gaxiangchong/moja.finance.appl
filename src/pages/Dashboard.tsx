import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, MONTHS } from '../context/AppContext';
import { filterByDateRange, getDateRange } from '../lib/utils';
import { fmt } from '../lib/format';
import type { DatePeriod } from '../lib/types';

export default function Dashboard() {
  const { transactions, categories } = useApp();
  const [period, setPeriod] = useState('mtd');
  const [catFilter, setCatFilter] = useState('');

  const data = useMemo(() => {
    const range = getDateRange(period as DatePeriod);
    let filtered = filterByDateRange(transactions, range);
    if (catFilter) filtered = filtered.filter((t) => t.category === catFilter);

    const income = filtered.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const expenses = filtered.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const profit = income - expenses;

    const debitTxs = filtered.filter((t) => t.type === 'debit');
    const catTotals: Record<string, number> = {};
    debitTxs.forEach((t) => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const maxCat = sortedCats.length ? sortedCats[0][1] : 1;

    const now = new Date();
    const my = now.getFullYear();
    const mm = now.getMonth();
    const mtd = transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === my && d.getMonth() === mm;
    });
    const ytd = transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === my;
    });
    const mtdIn = mtd.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const mtdOut = mtd.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const ytdIn = ytd.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const ytdOut = ytd.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

    const recentPool = catFilter ? transactions.filter((t) => t.category === catFilter) : transactions;
    const recent = [...recentPool].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

    const periodLabel =
      period === 'mtd'
        ? `${MONTHS[mm]} ${my}`
        : period === 'ytd'
          ? `Year ${my}`
          : period === 'last30'
            ? 'Last 30 days'
            : period === 'last90'
              ? 'Last 90 days'
              : 'All time';

    return {
      income,
      expenses,
      profit,
      filtered,
      sortedCats,
      maxCat,
      mtdIn,
      mtdOut,
      ytdIn,
      ytdOut,
      recent,
      periodLabel,
      mm,
      my,
    };
  }, [transactions, period, catFilter]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <div className="sub">{data.periodLabel}</div>
        </div>
        <div className="filter-group">
          <label>Period:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="mtd">Month to Date</option>
            <option value="ytd">Year to Date</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <label>Category:</label>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Total Income</div>
          <div className="value credit">{fmt(data.income)}</div>
          <div className="change">{data.filtered.filter((t) => t.type === 'credit').length} transactions</div>
        </div>
        <div className="card">
          <div className="label">Total Expenses</div>
          <div className="value debit">{fmt(data.expenses)}</div>
          <div className="change">{data.filtered.filter((t) => t.type === 'debit').length} transactions</div>
        </div>
        <div className="card">
          <div className="label">Net Profit / Loss</div>
          <div className="value profit" style={{ color: data.profit >= 0 ? 'var(--credit)' : 'var(--debit)' }}>
            {fmt(data.profit)}
          </div>
          <div className="change">{data.profit >= 0 ? 'Profitable' : 'Net loss'}</div>
        </div>
        <div className="card">
          <div className="label">Transactions</div>
          <div className="value">{data.filtered.length}</div>
          <div className="change">—</div>
        </div>
      </div>

      <div className="cat-grid">
        <div className="table-wrap">
          <div className="table-header">
            <h3>Expense by Category</h3>
          </div>
          <div style={{ padding: 16 }}>
            {!data.sortedCats.length ? (
              <div className="empty" style={{ padding: 24 }}>
                No expense data
              </div>
            ) : (
              data.sortedCats.map(([cat, amt]) => (
                <div key={cat} className="cat-bar">
                  <div className="cat-label">
                    <span>{cat}</span>
                    <span style={{ color: 'var(--debit)' }}>{fmt(amt)}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${((amt / data.maxCat) * 100).toFixed(1)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="mtd-ytd">
          <h3>MTD / YTD Summary</h3>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Month to Date ({MONTHS[data.mm]} {data.my})
            </div>
            <div className="stat-row">
              <span className="stat-label">Income</span>
              <span style={{ color: 'var(--credit)' }}>{fmt(data.mtdIn)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Expenses</span>
              <span style={{ color: 'var(--debit)' }}>{fmt(data.mtdOut)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Net</span>
              <span style={{ color: data.mtdIn - data.mtdOut >= 0 ? 'var(--credit)' : 'var(--debit)' }}>
                {fmt(data.mtdIn - data.mtdOut)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Year to Date ({data.my})
            </div>
            <div className="stat-row">
              <span className="stat-label">Income</span>
              <span style={{ color: 'var(--credit)' }}>{fmt(data.ytdIn)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Expenses</span>
              <span style={{ color: 'var(--debit)' }}>{fmt(data.ytdOut)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Net</span>
              <span style={{ color: data.ytdIn - data.ytdOut >= 0 ? 'var(--credit)' : 'var(--debit)' }}>
                {fmt(data.ytdIn - data.ytdOut)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <div className="table-header">
          <h3>Recent Transactions</h3>
          <Link to="/ledger" className="btn btn-outline btn-sm">
            View All
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {!data.recent.length ? (
              <tr>
                <td colSpan={5} className="empty">
                  No transactions yet
                </td>
              </tr>
            ) : (
              data.recent.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td>
                    <span className="cat-badge">{t.category}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${t.type}`}>{t.type === 'credit' ? 'Credit' : 'Debit'}</span>
                  </td>
                  <td className={`amount-${t.type}`}>
                    {t.type === 'debit' ? '-' : '+'}
                    {fmt(t.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
