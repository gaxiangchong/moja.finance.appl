import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import PClassTag from '../components/PClassTag';
import { useApp } from '../context/AppContext';
import { fmt } from '../lib/format';
import type { PaymentClass, Transaction, TransactionType } from '../lib/types';

export default function Ledger() {
  const { transactions, categories, canWrite, updateTransaction, deleteTransaction, deleteTransactions, exportCSV } = useApp();

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const catOptions = useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort(),
    [transactions],
  );

  const filtered = useMemo(() => {
    let txs = [...transactions];
    if (filterFrom) txs = txs.filter((t) => t.date >= filterFrom);
    if (filterTo) txs = txs.filter((t) => t.date <= filterTo);
    if (filterType) txs = txs.filter((t) => t.type === filterType);
    if (filterCat) txs = txs.filter((t) => t.category === filterCat);
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      txs = txs.filter(
        (t) =>
          t.description.toLowerCase().includes(s) ||
          (t.notes || '').toLowerCase().includes(s) ||
          (t.account || '').toLowerCase().includes(s) ||
          (t.ref || '').toLowerCase().includes(s),
      );
    }
    return txs.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterFrom, filterTo, filterType, filterCat, filterSearch]);

  const totalIn = filtered.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  const clearFilters = () => {
    setFilterFrom('');
    setFilterTo('');
    setFilterType('');
    setFilterCat('');
    setFilterSearch('');
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(filtered.map((t) => t.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} selected transaction(s)?`)) return;
    await deleteTransactions([...selected]);
    setSelected(new Set());
  };

  const saveEdit = async () => {
    if (!editTx) return;
    await updateTransaction(editTx.id, editTx);
    setEditTx(null);
  };

  const handleDelete = async () => {
    if (!editTx) return;
    if (!confirm('Delete this transaction?')) return;
    await deleteTransaction(editTx.id);
    setEditTx(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Transaction Ledger</h2>
          <div className="sub">All recorded transactions</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={exportCSV}>
            ⬇ Export CSV
          </button>
          <Link to="/entry" className="btn btn-primary btn-sm">
            + Add
          </Link>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>From:</label>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>To:</label>
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All</option>
            <option value="credit">Credit / Income</option>
            <option value="debit">Debit / Expense</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category:</label>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">All</option>
            {catOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 13,
              width: 160,
            }}
          />
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>
          Reset
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <h3>{filtered.length} transactions</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {selected.size > 0 && (
              <button type="button" className="btn btn-danger btn-sm" disabled={!canWrite} onClick={handleBulkDelete}>
                🗑 Delete Selected ({selected.size})
              </button>
            )}
            <span style={{ fontSize: 13, color: 'var(--credit)' }}>
              In: <strong>{fmt(totalIn)}</strong>
            </span>
            <span style={{ fontSize: 13, color: 'var(--debit)' }}>
              Out: <strong>{fmt(totalOut)}</strong>
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
              </th>
              <th>Date</th>
              <th>Description</th>
              <th>Account</th>
              <th>Category</th>
              <th>Class</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr>
                <td colSpan={10} className="empty">
                  No transactions match filters
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={(e) => toggleOne(t.id, e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                  </td>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{t.account || '—'}</td>
                  <td>
                    <span className="cat-badge">{t.category}</span>
                  </td>
                  <td>
                    <PClassTag cls={t.paymentClass || 'bill'} staffName={t.staffName} />
                  </td>
                  <td>
                    <span className={`badge badge-${t.type}`}>{t.type === 'credit' ? 'Credit' : 'Debit'}</span>
                  </td>
                  <td className={`amount-${t.type}`}>
                    {t.type === 'debit' ? '-' : '+'}
                    {fmt(t.amount)}
                  </td>
                  <td
                    style={{
                      color: 'var(--muted)',
                      fontSize: 12,
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.notes || t.ref || '—'}
                  </td>
                  <td>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditTx({ ...t })}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editTx}
        onClose={() => setEditTx(null)}
        title="Edit Transaction"
        actions={
          <>
            <button type="button" className="btn btn-danger btn-sm" disabled={!canWrite} onClick={handleDelete}>
              Delete
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setEditTx(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={saveEdit}>
              Save Changes
            </button>
          </>
        }
      >
        {editTx && (
          <div className="form-grid">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={editTx.date} onChange={(e) => setEditTx({ ...editTx, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editTx.amount}
                onChange={(e) => setEditTx({ ...editTx, amount: parseFloat(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={editTx.type} onChange={(e) => setEditTx({ ...editTx, type: e.target.value as TransactionType })}>
                <option value="debit">Debit / Expense</option>
                <option value="credit">Credit / Income</option>
              </select>
            </div>
            <div className="form-group">
              <label>Account</label>
              <input type="text" value={editTx.account} onChange={(e) => setEditTx({ ...editTx, account: e.target.value })} />
            </div>
            <div className="form-group full">
              <label>Description</label>
              <input type="text" value={editTx.description} onChange={(e) => setEditTx({ ...editTx, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={editTx.category} onChange={(e) => setEditTx({ ...editTx, category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Reference</label>
              <input type="text" value={editTx.ref} onChange={(e) => setEditTx({ ...editTx, ref: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Payment Class</label>
              <select
                value={editTx.paymentClass}
                onChange={(e) =>
                  setEditTx({
                    ...editTx,
                    paymentClass: e.target.value as PaymentClass,
                    staffName: e.target.value === 'reimbursement' ? editTx.staffName : '',
                  })
                }
              >
                <option value="bill">🧾 Bill to Company</option>
                <option value="reimbursement">💼 Reimbursement to Staff</option>
              </select>
            </div>
            {editTx.paymentClass === 'reimbursement' && (
              <div className="form-group">
                <label>Staff Name</label>
                <input type="text" value={editTx.staffName} onChange={(e) => setEditTx({ ...editTx, staffName: e.target.value })} />
              </div>
            )}
            <div className="form-group full">
              <label>Notes</label>
              <textarea value={editTx.notes} onChange={(e) => setEditTx({ ...editTx, notes: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
