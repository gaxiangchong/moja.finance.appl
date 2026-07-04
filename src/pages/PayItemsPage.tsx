import { useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { PI_MONTHS } from '../lib/config';
import { fmt2 } from '../lib/format';
import { computePayItemAmount, holidaysInMonth, isStatutoryEarning } from '../lib/payroll';
import type { OTType, PayItemType } from '../lib/types';

const TYPE_LABELS: Record<PayItemType, string> = {
  allowance: 'Allowance',
  claim: 'Claim / Reimburse',
  overtime: 'Overtime',
  ph: 'Public Holiday',
};

const OT_LABELS: Record<string, string> = {
  weekday: 'weekday 1.5×',
  restday: 'rest day 2×',
  holiday: 'holiday 3×',
};

const YEAR_OPTIONS = [2025, 2026, 2027];

export default function PayItemsPage() {
  const { employees, payItems, publicHolidays, canWrite, savePayItem, deletePayItem, showToast } = useApp();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    employeeId: '',
    type: 'allowance' as PayItemType,
    label: '',
    amount: '',
    otType: 'weekday' as OTType,
    hours: '',
    phDays: '',
    notes: '',
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees],
  );

  const periodItems = useMemo(() => {
    const items = payItems.filter((p) => p.month === month && p.year === year);
    return items
      .map((p) => {
        const emp = employees.find((e) => e.id === p.employeeId);
        const amt = computePayItemAmount(p, emp, publicHolidays);
        let detail = p.label || '';
        if (p.type === 'overtime') detail = `${p.hours || 0}h · ${OT_LABELS[p.otType] || p.otType}`;
        else if (p.type === 'ph') detail = `${p.phDays || 0} PH day(s) worked`;
        return { p, emp, amt, detail, name: emp ? emp.name : '(removed employee)' };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payItems, month, year, employees, publicHolidays]);

  const openModal = () => {
    if (!activeEmployees.length) {
      showToast('Add employees first', 'error');
      return;
    }
    setForm({
      employeeId: activeEmployees[0].id,
      type: 'allowance',
      label: '',
      amount: '',
      otType: 'weekday',
      hours: '',
      phDays: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const selectedEmp = employees.find((e) => e.id === form.employeeId);
  const isAmt = form.type === 'allowance' || form.type === 'claim';
  const nPh = holidaysInMonth(year, month, publicHolidays).length;

  const draftItem = {
    type: form.type,
    year,
    month,
    amount: parseFloat(form.amount) || 0,
    otType: form.otType,
    hours: parseFloat(form.hours) || 0,
    phDays: parseInt(form.phDays) || 0,
  };
  const computedAmt = computePayItemAmount(draftItem, selectedEmp, publicHolidays);

  let computedHint = '';
  if (form.type === 'overtime' && selectedEmp) {
    const basic = parseFloat(String(selectedEmp.basicSalary)) || 0;
    const dh = parseFloat(String(selectedEmp.dailyHours)) || 8;
    computedHint = `Hourly rate = Basic÷26÷${dh} = RM ${fmt2(basic / 26 / dh)}  →  × multiplier × ${draftItem.hours}h`;
  } else if (form.type === 'ph') {
    computedHint = `${nPh} public holiday(s) this month · rate × Basic÷26 per day`;
  } else if (form.type === 'claim') {
    computedHint = 'Exempt — added to net pay, not subject to EPF/SOCSO/EIS/PCB';
  } else {
    computedHint = 'Subject to EPF/SOCSO/EIS/PCB';
  }

  const handleSave = async () => {
    if (!form.employeeId) {
      showToast('Select an employee', 'error');
      return;
    }
    const emp = employees.find((e) => e.id === form.employeeId);
    const base = {
      employeeId: form.employeeId,
      month,
      year,
      type: form.type,
      label: '',
      otType: '',
      hours: 0,
      phDays: 0,
      amount: 0,
      notes: form.notes.trim(),
    };

    if (form.type === 'allowance' || form.type === 'claim') {
      const amount = parseFloat(form.amount) || 0;
      if (amount <= 0) {
        showToast('Enter an amount greater than 0', 'error');
        return;
      }
      base.label = form.label.trim();
      base.amount = Math.round(amount * 100) / 100;
    } else if (form.type === 'overtime') {
      const hours = parseFloat(form.hours) || 0;
      if (hours <= 0) {
        showToast('Enter overtime hours', 'error');
        return;
      }
      base.otType = form.otType;
      base.hours = hours;
      base.amount = computePayItemAmount({ ...base, otType: form.otType, hours }, emp, publicHolidays);
    } else if (form.type === 'ph') {
      if (!nPh) {
        showToast('No public holidays in this month', 'error');
        return;
      }
      const phDays = Math.min(Math.max(parseInt(form.phDays) || 0, 0), nPh);
      if (phDays <= 0) {
        showToast('Enter PH days worked', 'error');
        return;
      }
      base.phDays = phDays;
      base.amount = computePayItemAmount({ ...base, phDays }, emp, publicHolidays);
    }

    const ok = await savePayItem(base);
    if (ok) setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this pay item?')) return;
    await deletePayItem(id);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Pay Items</h2>
          <div className="sub">Allowances · Claims/Reimbursements · Overtime · Public Holiday pay — pulled into Run Payroll</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '7px 10px',
              borderRadius: 7,
              fontSize: 13,
            }}
          >
            {PI_MONTHS.slice(1).map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '7px 10px',
              borderRadius: 7,
              fontSize: 13,
            }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={openModal}>
            + Add Pay Item
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Detail</th>
              <th>Amount (RM)</th>
              <th>Statutory</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!periodItems.length ? (
              <tr>
                <td colSpan={6} className="empty">
                  No pay items for this period
                </td>
              </tr>
            ) : (
              periodItems.map(({ p, amt, detail, name }) => (
                <tr key={p.id}>
                  <td>
                    <strong>{name}</strong>
                  </td>
                  <td>{TYPE_LABELS[p.type] || p.type}</td>
                  <td>
                    {detail || '—'}
                    {p.notes && (
                      <>
                        <br />
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.notes}</span>
                      </>
                    )}
                  </td>
                  <td>RM {fmt2(amt)}</td>
                  <td>
                    {isStatutoryEarning(p.type) ? (
                      <span className="leave-chip leave-approved">Applicable</span>
                    ) : (
                      <span className="leave-chip leave-unpaid">Exempt</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={!canWrite}
                      onClick={() => handleDelete(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        💡 Allowance, Overtime &amp; Public Holiday pay are wages (subject to EPF/SOCSO/EIS/PCB). Claims/Reimbursements are
        paid on top of net pay and are exempt from statutory deductions.
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Pay Item"
        width={500}
        actions={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={handleSave}>
              Save Pay Item
            </button>
          </>
        }
      >
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Recording for: {PI_MONTHS[month]} {year}
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Employee *</label>
            <select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PayItemType }))}
            >
              <option value="allowance">Allowance</option>
              <option value="claim">Claim / Reimbursement</option>
              <option value="overtime">Overtime</option>
              <option value="ph">Public Holiday Pay</option>
            </select>
          </div>
          {isAmt && (
            <>
              <div className="form-group full">
                <label>{form.type === 'claim' ? 'Claim Description' : 'Label'}</label>
                <input
                  type="text"
                  placeholder="e.g. Transport allowance"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Amount (RM) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </>
          )}
          {form.type === 'overtime' && (
            <>
              <div className="form-group">
                <label>OT Type</label>
                <select
                  value={form.otType}
                  onChange={(e) => setForm((f) => ({ ...f, otType: e.target.value as OTType }))}
                >
                  <option value="weekday">Weekday (1.5×)</option>
                  <option value="restday">Rest Day (2.0×)</option>
                  <option value="holiday">Public Holiday (3.0×)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Hours *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                />
              </div>
            </>
          )}
          {form.type === 'ph' && (
            <div className="form-group">
              <label>PH Days Worked *</label>
              <input
                type="number"
                step="1"
                min="0"
                max={nPh}
                placeholder="0"
                value={form.phDays}
                onChange={(e) => setForm((f) => ({ ...f, phDays: e.target.value }))}
              />
            </div>
          )}
          <div className="form-group full">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <div className="mini-card" style={{ marginTop: 4, background: 'var(--surface2)' }}>
          <div className="lbl">Computed Amount</div>
          <div className="val" style={{ fontSize: 18 }}>
            RM {fmt2(computedAmt)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{computedHint}</div>
        </div>
      </Modal>
    </>
  );
}
