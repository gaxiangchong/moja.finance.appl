import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { PaymentClass, TransactionType } from '../lib/types';

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  type: 'debit' as TransactionType,
  account: '',
  description: '',
  category: '',
  ref: '',
  paymentClass: 'bill' as PaymentClass,
  staffName: '',
  notes: '',
});

export default function EntryPage() {
  const { categories, canWrite, addTransaction, addCategory } = useApp();
  const [form, setForm] = useState(emptyForm);

  const set = (field: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleAddCategory = () => {
    const name = (prompt('New category name:') || '').trim();
    if (!name) return;
    if (addCategory(name)) set('category', name);
  };

  const clearForm = () => setForm(emptyForm());

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.date || !amount || !form.description.trim()) return;
    const ok = await addTransaction({
      date: form.date,
      amount,
      type: form.type,
      account: form.account.trim(),
      description: form.description.trim(),
      category: form.category || categories[0] || 'Other',
      ref: form.ref.trim(),
      notes: form.notes.trim(),
      paymentClass: form.paymentClass,
      staffName: form.paymentClass === 'reimbursement' ? form.staffName.trim() : '',
      source: 'manual',
    });
    if (ok) clearForm();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Manual Entry</h2>
          <div className="sub">Add a transaction manually</div>
        </div>
      </div>

      <div className="table-wrap" style={{ padding: 24 }}>
        <div className="form-grid">
          <div className="form-group">
            <label>Date *</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Amount *</label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Type *</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="debit">Debit / Expense</option>
              <option value="credit">Credit / Income</option>
            </select>
          </div>
          <div className="form-group">
            <label>Account</label>
            <input
              type="text"
              placeholder="e.g. Business Checking, Cash"
              value={form.account}
              onChange={(e) => set('account', e.target.value)}
            />
          </div>
          <div className="form-group full">
            <label>Description *</label>
            <input
              type="text"
              placeholder="What was this payment for?"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select style={{ flex: 1 }} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAddCategory}>
                + New
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Reference / Invoice #</label>
            <input type="text" placeholder="Optional" value={form.ref} onChange={(e) => set('ref', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Payment Class</label>
            <select
              value={form.paymentClass}
              onChange={(e) => {
                const pc = e.target.value as PaymentClass;
                setForm((f) => ({
                  ...f,
                  paymentClass: pc,
                  staffName: pc === 'reimbursement' ? f.staffName : '',
                }));
              }}
            >
              <option value="bill">🧾 Bill to Company</option>
              <option value="reimbursement">💼 Reimbursement to Staff</option>
            </select>
          </div>
          {form.paymentClass === 'reimbursement' && (
            <div className="form-group">
              <label>Staff Name</label>
              <input
                type="text"
                placeholder="e.g. Alice Tan"
                value={form.staffName}
                onChange={(e) => set('staffName', e.target.value)}
              />
            </div>
          )}
          <div className="form-group full">
            <label>Notes</label>
            <textarea
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-success" disabled={!canWrite} onClick={handleSave}>
            Save Transaction
          </button>
          <button type="button" className="btn btn-outline" onClick={clearForm}>
            Clear
          </button>
        </div>
      </div>
    </>
  );
}
