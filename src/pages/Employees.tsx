import { useState } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { empInitials } from '../lib/utils';
import { leaveEntitlement } from '../lib/payroll';
import type { Employee } from '../lib/types';

const emptyForm = (): Partial<Employee> & { name: string; basicSalary: number; joinDate: string } => ({
  name: '',
  basicSalary: 0,
  joinDate: new Date().toISOString().slice(0, 10),
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
});

export default function Employees() {
  const { employees, bonusPackages, canWrite, saveEmployee, deleteEmployee } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditingId(e.id);
    setForm({ ...e });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.basicSalary || !form.joinDate) return;
    const ok = await saveEmployee(
      {
        ...form,
        name: form.name.trim(),
        basicSalary: Number(form.basicSalary),
        joinDate: form.joinDate,
      },
      editingId || undefined,
    );
    if (ok) closeModal();
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Delete this employee? Leave records will remain.')) return;
    const ok = await deleteEmployee(editingId);
    if (ok) closeModal();
  };

  const set = (field: keyof Employee, value: string | number) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Employees</h2>
          <div className="sub">Manage employee records</div>
        </div>
        <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={openAdd}>
          + Add Employee
        </button>
      </div>

      <div id="empList">
        {!employees.length ? (
          <div className="empty" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
            No employees yet — add one to get started
          </div>
        ) : (
          employees.map((e) => {
            const ent = leaveEntitlement(e.joinDate);
            return (
              <div
                key={e.id}
                className={`emp-card ${e.status === 'inactive' ? 'emp-inactive' : ''}`}
                onClick={() => openEdit(e)}
                onKeyDown={(ev) => ev.key === 'Enter' && openEdit(e)}
                role="button"
                tabIndex={0}
              >
                <div className="emp-avatar">{empInitials(e.name)}</div>
                <div className="emp-info">
                  <div className="emp-name">
                    {e.name}{' '}
                    {e.status === 'inactive' && (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>(Inactive)</span>
                    )}
                  </div>
                  <div className="emp-sub">
                    {e.position || '—'} &nbsp;·&nbsp; {e.department || '—'} &nbsp;·&nbsp; {e.employeeId || '—'}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="stat-pill">🗓 Joined {e.joinDate}</span>
                    <span className="stat-pill">AL: {ent.annual}d</span>
                    <span className="stat-pill">MC: {ent.medical}d</span>
                    <span className="stat-pill">🏦 {e.bank || '—'}</span>
                  </div>
                </div>
                <div className="emp-salary">
                  RM {Number(e.basicSalary).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Employee' : 'Add Employee'}
        width={620}
        actions={
          <>
            {editingId && (
              <button type="button" className="btn btn-danger btn-sm" disabled={!canWrite} onClick={handleDelete}>
                Delete
              </button>
            )}
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={handleSave}>
              Save Employee
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input type="text" placeholder="As per IC/Passport" value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Employee ID</label>
            <input type="text" placeholder="e.g. EMP001" value={form.employeeId || ''} onChange={(e) => set('employeeId', e.target.value)} />
          </div>
          <div className="form-group">
            <label>IC / Passport No.</label>
            <input type="text" placeholder="e.g. 900101-01-1234" value={form.ic || ''} onChange={(e) => set('ic', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Position / Job Title</label>
            <input type="text" placeholder="e.g. Software Engineer" value={form.position || ''} onChange={(e) => set('position', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Department</label>
            <input type="text" placeholder="e.g. Engineering" value={form.department || ''} onChange={(e) => set('department', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Join Date *</label>
            <input type="date" value={form.joinDate || ''} onChange={(e) => set('joinDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Basic Monthly Salary (RM) *</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.basicSalary || ''} onChange={(e) => set('basicSalary', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label>Working Days/Week</label>
            <select value={String(form.workDays ?? 5)} onChange={(e) => set('workDays', parseFloat(e.target.value))}>
              <option value="5">5 days</option>
              <option value="5.5">5.5 days</option>
              <option value="6">6 days</option>
            </select>
          </div>
          <div className="form-group">
            <label>Weekly Rest Day</label>
            <select value={form.restDays ?? '0'} onChange={(e) => set('restDays', e.target.value)}>
              <option value="0">Sunday (6-day week)</option>
              <option value="1">Monday (6-day week)</option>
              <option value="2">Tuesday (6-day week)</option>
              <option value="3">Wednesday (6-day week)</option>
              <option value="4">Thursday (6-day week)</option>
              <option value="5">Friday (6-day week)</option>
              <option value="6">Saturday (6-day week)</option>
              <option value="0,6">Sat & Sun (5-day week)</option>
              <option value="">None (works 7 days)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Daily Working Hours</label>
            <select value={String(form.dailyHours ?? 8)} onChange={(e) => set('dailyHours', parseFloat(e.target.value))}>
              <option value="8">8 hours</option>
              <option value="8.5">8.5 hours</option>
              <option value="9">9 hours</option>
              <option value="9.5">9.5 hours</option>
            </select>
          </div>
          <div className="form-group">
            <label>Residency Status</label>
            <select value={form.residency || 'resident'} onChange={(e) => set('residency', e.target.value)}>
              <option value="resident">Resident</option>
              <option value="non-resident">Non-Resident</option>
            </select>
          </div>
          <div className="form-group">
            <label>Marital Status</label>
            <select value={form.marital || 'single'} onChange={(e) => set('marital', e.target.value)}>
              <option value="single">Single</option>
              <option value="married">Married (spouse working)</option>
              <option value="married-spouse-not-working">Married (spouse not working)</option>
            </select>
          </div>
          <div className="form-group">
            <label>No. of Children</label>
            <input type="number" min="0" value={form.children ?? 0} onChange={(e) => set('children', parseInt(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label>EPF No.</label>
            <input type="text" placeholder="Optional" value={form.epfNo || ''} onChange={(e) => set('epfNo', e.target.value)} />
          </div>
          <div className="form-group">
            <label>SOCSO No.</label>
            <input type="text" placeholder="Optional" value={form.socsoNo || ''} onChange={(e) => set('socsoNo', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Income Tax No.</label>
            <input type="text" placeholder="Optional" value={form.taxNo || ''} onChange={(e) => set('taxNo', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Bank</label>
            <input type="text" placeholder="e.g. Maybank" value={form.bank || ''} onChange={(e) => set('bank', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Bank Account No.</label>
            <input type="text" placeholder="Optional" value={form.bankAcc || ''} onChange={(e) => set('bankAcc', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status || 'active'} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group">
            <label>Last Working Day</label>
            <input type="date" value={form.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Bonus Package</label>
            <select value={form.packageId || ''} onChange={(e) => set('packageId', e.target.value)}>
              <option value="">None</option>
              {bonusPackages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </>
  );
}
