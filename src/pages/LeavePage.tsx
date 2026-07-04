import { useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { leaveEntitlement, workingDaysBetween, yearsOfService } from '../lib/payroll';
import type { LeaveType, PublicHoliday } from '../lib/types';

type LeaveTab = 'applications' | 'balances' | 'holidays';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LeavePage() {
  const {
    leaveRecords,
    employees,
    publicHolidays,
    canWrite,
    saveLeave,
    deleteLeave,
    saveHoliday,
    deleteHoliday,
    showToast,
  } = useApp();

  const [tab, setTab] = useState<LeaveTab>('applications');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    type: 'annual' as LeaveType,
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    status: 'approved',
    reason: '',
  });

  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    type: 'Federal',
    rate: 1.5,
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees],
  );

  const sortedLeave = useMemo(
    () => [...leaveRecords].sort((a, b) => b.from.localeCompare(a.from)),
    [leaveRecords],
  );

  const sortedHolidays = useMemo(
    () => [...publicHolidays].sort((a, b) => a.date.localeCompare(b.date)),
    [publicHolidays],
  );

  const openLeaveModal = () => {
    if (!activeEmployees.length) {
      showToast('Add employees first', 'error');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    setLeaveForm({
      employeeId: activeEmployees[0].id,
      type: 'annual',
      from: today,
      to: today,
      status: 'approved',
      reason: '',
    });
    setLeaveModalOpen(true);
  };

  const handleSaveLeave = async () => {
    const emp = employees.find((e) => e.id === leaveForm.employeeId);
    if (!leaveForm.employeeId || !leaveForm.from || !leaveForm.to) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (leaveForm.to < leaveForm.from) {
      showToast('End date must be ≥ start date', 'error');
      return;
    }
    const days = workingDaysBetween(leaveForm.from, leaveForm.to, emp, publicHolidays);
    const ok = await saveLeave({
      employeeId: leaveForm.employeeId,
      type: leaveForm.type,
      from: leaveForm.from,
      to: leaveForm.to,
      days,
      status: leaveForm.status,
      reason: leaveForm.reason.trim(),
    });
    if (ok) setLeaveModalOpen(false);
  };

  const handleDeleteLeave = async (id: string) => {
    if (!confirm('Remove this leave record?')) return;
    await deleteLeave(id);
  };

  const openHolidayModal = () => {
    setHolidayForm({ date: '', name: '', type: 'Federal', rate: 1.5 });
    setHolidayModalOpen(true);
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.date || !holidayForm.name.trim()) {
      showToast('Please enter a date and holiday name', 'error');
      return;
    }
    if (publicHolidays.some((h) => h.date === holidayForm.date)) {
      showToast('A holiday already exists on that date', 'error');
      return;
    }
    const ok = await saveHoliday({
      date: holidayForm.date,
      name: holidayForm.name.trim(),
      type: holidayForm.type,
      rate: holidayForm.rate,
    });
    if (ok) setHolidayModalOpen(false);
  };

  const handleRateChange = async (h: PublicHoliday, rate: number) => {
    await saveHoliday({ ...h, rate }, h.id);
  };

  const handleDeleteHoliday = async (h: PublicHoliday) => {
    if (!confirm(`Remove "${h.name}" (${h.date})?`)) return;
    await deleteHoliday(h.id);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Leave Management</h2>
          <div className="sub">Johor 2026 calendar — EA 1955 entitlements</div>
        </div>
        <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={openLeaveModal}>
          + Apply Leave
        </button>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className={`tab-btn${tab === 'applications' ? ' active' : ''}`}
          onClick={() => setTab('applications')}
        >
          Applications
        </button>
        <button
          type="button"
          className={`tab-btn${tab === 'balances' ? ' active' : ''}`}
          onClick={() => setTab('balances')}
        >
          Leave Balances
        </button>
        <button
          type="button"
          className={`tab-btn${tab === 'holidays' ? ' active' : ''}`}
          onClick={() => setTab('holidays')}
        >
          Public Holidays
        </button>
      </div>

      {tab === 'applications' && (
        <div className="tab-panel active">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {!sortedLeave.length ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      No leave applications
                    </td>
                  </tr>
                ) : (
                  sortedLeave.map((r) => {
                    const emp = employees.find((e) => e.id === r.employeeId);
                    return (
                      <tr key={r.id}>
                        <td>{emp ? emp.name : '—'}</td>
                        <td>
                          <span className={`leave-chip leave-${r.type}`}>
                            {r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                          </span>
                        </td>
                        <td>{r.from}</td>
                        <td>{r.to}</td>
                        <td>{r.days}</td>
                        <td>
                          <span className={`leave-chip leave-${r.status}`}>{r.status}</span>
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{r.reason || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={!canWrite}
                            onClick={() => handleDeleteLeave(r.id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'balances' && (
        <div className="tab-panel active">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Years of Service</th>
                  <th>Annual Entitlement</th>
                  <th>AL Used</th>
                  <th>AL Balance</th>
                  <th>Medical Entitlement</th>
                  <th>MC Used</th>
                  <th>MC Balance</th>
                </tr>
              </thead>
              <tbody>
                {!activeEmployees.length ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      No employees
                    </td>
                  </tr>
                ) : (
                  activeEmployees.map((e) => {
                    const ent = leaveEntitlement(e.joinDate);
                    const yrs = yearsOfService(e.joinDate).toFixed(1);
                    const approved = leaveRecords.filter(
                      (r) => r.employeeId === e.id && r.status === 'approved',
                    );
                    const alUsed = approved.filter((r) => r.type === 'annual').reduce((s, r) => s + r.days, 0);
                    const mcUsed = approved.filter((r) => r.type === 'medical').reduce((s, r) => s + r.days, 0);
                    const alBal = ent.annual - alUsed;
                    const mcBal = ent.medical - mcUsed;
                    return (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.name}</strong>
                          <br />
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{e.position || ''}</span>
                        </td>
                        <td>{yrs} yrs</td>
                        <td>{ent.annual} days</td>
                        <td>{alUsed}</td>
                        <td style={{ color: alBal < 0 ? 'var(--debit)' : 'var(--credit)', fontWeight: 600 }}>
                          {alBal}
                        </td>
                        <td>{ent.medical} days</td>
                        <td>{mcUsed}</td>
                        <td style={{ color: mcBal < 0 ? 'var(--debit)' : 'var(--credit)', fontWeight: 600 }}>
                          {mcBal}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'holidays' && (
        <div className="tab-panel active">
          <div className="table-wrap" style={{ overflow: 'hidden' }}>
            <div className="table-header">
              <div>
                <h3>Public Holidays</h3>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Rate = OT multiplier earned if worked on the holiday
                </span>
              </div>
              <button type="button" className="btn btn-primary btn-sm" disabled={!canWrite} onClick={openHolidayModal}>
                + Add Holiday
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Holiday</th>
                  <th>Type</th>
                  <th>Rate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {!sortedHolidays.length ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      No public holidays — click "+ Add Holiday"
                    </td>
                  </tr>
                ) : (
                  sortedHolidays.map((h) => {
                    const dow = DAYS[new Date(h.date + 'T00:00:00').getDay()];
                    const rate = h.rate || 1.5;
                    return (
                      <tr key={h.id}>
                        <td>{h.date}</td>
                        <td>{dow}</td>
                        <td>{h.name}</td>
                        <td>
                          <span className="ph-badge">{h.type}</span>
                        </td>
                        <td>
                          <select
                            value={String(rate)}
                            disabled={!canWrite}
                            onChange={(e) => handleRateChange(h, parseFloat(e.target.value) || 1.5)}
                            style={{
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text)',
                              padding: '4px 6px',
                              borderRadius: 4,
                              fontSize: 12,
                            }}
                          >
                            <option value="1.5">1.5×</option>
                            <option value="2">2.0×</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={!canWrite}
                            onClick={() => handleDeleteHoliday(h)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Leave Application"
        width={480}
        actions={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setLeaveModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={handleSaveLeave}>
              Save
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group full">
            <label>Employee *</label>
            <select
              value={leaveForm.employeeId}
              onChange={(e) => setLeaveForm((f) => ({ ...f, employeeId: e.target.value }))}
            >
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Leave Type *</label>
            <select
              value={leaveForm.type}
              onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value as LeaveType }))}
            >
              <option value="annual">Annual Leave (AL)</option>
              <option value="medical">Medical Leave (MC)</option>
              <option value="emergency">Emergency Leave (EL)</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={leaveForm.status}
              onChange={(e) => setLeaveForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="form-group">
            <label>From Date *</label>
            <input
              type="date"
              value={leaveForm.from}
              onChange={(e) => setLeaveForm((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>To Date *</label>
            <input
              type="date"
              value={leaveForm.to}
              onChange={(e) => setLeaveForm((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
          <div className="form-group full">
            <label>Reason</label>
            <input
              type="text"
              placeholder="Optional"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        title="Add Public Holiday"
        width={460}
        actions={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setHolidayModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={handleSaveHoliday}>
              Save Holiday
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={holidayForm.date}
              onChange={(e) => setHolidayForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select
              value={holidayForm.type}
              onChange={(e) => setHolidayForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="Federal">Federal</option>
              <option value="Johor">Johor</option>
              <option value="Company">Company</option>
            </select>
          </div>
          <div className="form-group full">
            <label>Holiday Name *</label>
            <input
              type="text"
              placeholder="e.g. Company Anniversary"
              value={holidayForm.name}
              onChange={(e) => setHolidayForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group full">
            <label>Pay Rate if Worked</label>
            <select
              value={String(holidayForm.rate)}
              onChange={(e) => setHolidayForm((f) => ({ ...f, rate: parseFloat(e.target.value) }))}
            >
              <option value="1.5">1.5× (one and a half)</option>
              <option value="2">2.0× (double)</option>
            </select>
          </div>
        </div>
      </Modal>
    </>
  );
}
