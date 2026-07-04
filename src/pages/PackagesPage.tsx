import { useState, type Dispatch, type SetStateAction } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { fmt2 } from '../lib/format';
import type { BonusPackage, CompanyTier, SOPTier } from '../lib/types';
import { uid } from '../lib/utils';

interface TierRow {
  id: string;
  first: string;
  amount: string;
}

function pkgSummary(p: BonusPackage): string {
  const parts: string[] = [];
  if (p.sopEnabled) parts.push(`SOP (${(p.sopTiers || []).length} tier${(p.sopTiers || []).length === 1 ? '' : 's'})`);
  if (p.perunitEnabled) parts.push(`${p.perunitLabel || 'unit'} @ RM${fmt2(p.perunitRate || 0)}`);
  if (p.companyEnabled)
    parts.push(`Company (${(p.companyTiers || []).length} tier${(p.companyTiers || []).length === 1 ? '' : 's'})`);
  return parts.length ? parts.join(' · ') : 'No components';
}

function readSopTiers(rows: TierRow[]): SOPTier[] {
  return rows
    .map((r) => ({
      minScore: parseFloat(r.first) || 0,
      amount: parseFloat(r.amount) || 0,
    }))
    .filter((t) => t.amount > 0)
    .sort((a, b) => b.minScore - a.minScore);
}

function readCompanyTiers(rows: TierRow[]): CompanyTier[] {
  return rows
    .map((r) => ({
      minSales: parseFloat(r.first) || 0,
      amount: parseFloat(r.amount) || 0,
    }))
    .filter((t) => t.amount > 0)
    .sort((a, b) => b.minSales - a.minSales);
}

export default function PackagesPage() {
  const { employees, bonusPackages, canWrite, savePackage, deletePackage, showToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [sopEnabled, setSopEnabled] = useState(false);
  const [perunitEnabled, setPerunitEnabled] = useState(false);
  const [companyEnabled, setCompanyEnabled] = useState(false);
  const [perunitLabel, setPerunitLabel] = useState('');
  const [perunitRate, setPerunitRate] = useState('');
  const [sopTiers, setSopTiers] = useState<TierRow[]>([]);
  const [companyTiers, setCompanyTiers] = useState<TierRow[]>([]);

  const addTier = (kind: 'score' | 'sales', first = '', amount = '') => {
    const row: TierRow = { id: uid(), first: String(first), amount: String(amount) };
    if (kind === 'score') setSopTiers((prev) => [...prev, row]);
    else setCompanyTiers((prev) => [...prev, row]);
  };

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setSopEnabled(false);
    setPerunitEnabled(false);
    setCompanyEnabled(false);
    setPerunitLabel('');
    setPerunitRate('');
    setSopTiers([]);
    setCompanyTiers([]);
    setModalOpen(true);
  };

  const openEdit = (p: BonusPackage) => {
    setEditingId(p.id);
    setName(p.name);
    setSopEnabled(p.sopEnabled);
    setPerunitEnabled(p.perunitEnabled);
    setCompanyEnabled(p.companyEnabled);
    setPerunitLabel(p.perunitLabel || '');
    setPerunitRate(String(p.perunitRate || ''));
    setSopTiers((p.sopTiers || []).map((t) => ({ id: uid(), first: String(t.minScore), amount: String(t.amount) })));
    setCompanyTiers(
      (p.companyTiers || []).map((t) => ({ id: uid(), first: String(t.minSales), amount: String(t.amount) })),
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Enter a package name', 'error');
      return;
    }
    const pkg: BonusPackage = {
      id: editingId || uid(),
      name: name.trim(),
      sopEnabled,
      sopTiers: readSopTiers(sopTiers),
      perunitEnabled,
      perunitLabel: perunitLabel.trim() || 'unit',
      perunitRate: parseFloat(perunitRate) || 0,
      companyEnabled,
      companyTiers: readCompanyTiers(companyTiers),
    };
    const ok = await savePackage(pkg);
    if (ok) closeModal();
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const inUse = employees.filter((e) => e.packageId === editingId).length;
    if (!confirm(`Delete this package?${inUse ? ` ${inUse} employee(s) are assigned and will have no package.` : ''}`))
      return;
    const ok = await deletePackage(editingId);
    if (ok) closeModal();
  };

  const renderTierRows = (
    rows: TierRow[],
    setRows: Dispatch<SetStateAction<TierRow[]>>,
    kind: 'score' | 'sales',
  ) => (
    <>
      {rows.map((row) => (
        <div key={row.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
          <input
            type="number"
            step={kind === 'score' ? '1' : '0.01'}
            min="0"
            placeholder={kind === 'score' ? 'Min score' : 'Min sales (RM)'}
            value={row.first}
            onChange={(e) =>
              setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, first: e.target.value } : r)))
            }
            style={{
              flex: 1,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '5px 7px',
              borderRadius: 5,
              fontSize: 12,
            }}
          />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>→ RM</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={row.amount}
            onChange={(e) =>
              setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)))
            }
            style={{
              flex: 1,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '5px 7px',
              borderRadius: 5,
              fontSize: 12,
            }}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 6 }} onClick={() => addTier(kind)}>
        + Add Tier
      </button>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Bonus Packages</h2>
          <div className="sub">Configurable comp plans — SOP performance · per-unit incentive · company-tier bonus</div>
        </div>
        <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={openAdd}>
          + Add Package
        </button>
      </div>

      <div id="packageList">
        {!bonusPackages.length ? (
          <div className="empty" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
            No packages yet
          </div>
        ) : (
          bonusPackages.map((p) => (
            <div
              key={p.id}
              className="emp-card"
              style={{ cursor: 'pointer' }}
              onClick={() => openEdit(p)}
              onKeyDown={(ev) => ev.key === 'Enter' && openEdit(p)}
              role="button"
              tabIndex={0}
            >
              <div className="emp-avatar" style={{ background: 'var(--accent2)', fontSize: 14 }}>
                🏆
              </div>
              <div className="emp-info">
                <div className="emp-name">{p.name}</div>
                <div className="emp-sub">{pkgSummary(p)}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="stat-pill">{employees.filter((e) => e.packageId === p.id).length} employee(s)</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        💡 Assign a package to each employee (Employees → edit). Bonuses compute at Run Payroll from the package rules +
        monthly inputs and are added to gross (subject to EPF/SOCSO/EIS/PCB).
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Bonus Package' : 'Add Bonus Package'}
        width={560}
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
              Save Package
            </button>
          </>
        }
      >
        <div className="form-group full" style={{ marginBottom: 14 }}>
          <label>Package Name *</label>
          <input type="text" placeholder="e.g. Hot Kitchen Chef" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="mini-card" style={{ background: 'var(--surface2)', marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={sopEnabled} onChange={(e) => setSopEnabled(e.target.checked)} />
            SOP Performance Bonus
          </label>
          {sopEnabled && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                Score tiers — bonus = amount of the highest tier the score meets.
              </div>
              {renderTierRows(sopTiers, setSopTiers, 'score')}
            </div>
          )}
        </div>

        <div className="mini-card" style={{ background: 'var(--surface2)', marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={perunitEnabled} onChange={(e) => setPerunitEnabled(e.target.checked)} />
            Per-Unit Sales Incentive
          </label>
          {perunitEnabled && (
            <div style={{ marginTop: 10 }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Unit Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Bento"
                    value={perunitLabel}
                    onChange={(e) => setPerunitLabel(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>RM per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1.00"
                    value={perunitRate}
                    onChange={(e) => setPerunitRate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mini-card" style={{ background: 'var(--surface2)', marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={companyEnabled} onChange={(e) => setCompanyEnabled(e.target.checked)} />
            Company-Performance Tier
          </label>
          {companyEnabled && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                Sales tiers — bonus = amount of the highest tier the month&apos;s company sales meets.
              </div>
              {renderTierRows(companyTiers, setCompanyTiers, 'sales')}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
