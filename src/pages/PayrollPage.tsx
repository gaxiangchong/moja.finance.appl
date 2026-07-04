import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { PI_MONTHS } from '../lib/config';
import { fmt2 } from '../lib/format';
import { workingDaysInMonth, workingDaysInMonthForEmp } from '../lib/payroll';
import type { BonusPackage, Employee, PayrollEntry, PublicHoliday } from '../lib/types';

const YEAR_OPTIONS = [2025, 2026, 2027];

const ATT_ABBR: Record<string, string> = {
  annual: 'AL',
  medical: 'MC',
  emergency: 'EL',
  maternity: 'Mat',
  paternity: 'Pat',
  unpaid: 'Unpaid',
};

const LEAVE_LABELS: Record<string, string> = {
  annual: 'Annual',
  medical: 'Medical',
  emergency: 'Emergency',
  maternity: 'Maternity',
  paternity: 'Paternity',
  unpaid: 'Unpaid',
};

function attSummary(
  entry: PayrollEntry,
  emp: Employee | undefined,
  year: number,
  month: number,
  publicHolidays: PublicHoliday[],
) {
  const att = entry.attendance || {};
  const wdMonth = emp
    ? workingDaysInMonthForEmp(emp, year, month, publicHolidays)
    : workingDaysInMonth(year, month, publicHolidays);
  const parts = Object.keys(ATT_ABBR)
    .filter((k) => (att[k] || 0) > 0)
    .map((k) => `${ATT_ABBR[k]} ${att[k]}`);
  const worked = Math.max(wdMonth - (att.total || 0), 0);
  return (
    <>
      <span title={`Working days this month: ${wdMonth}`}>
        {worked}/{wdMonth} wd
      </span>
      {parts.length > 0 && (
        <>
          <br />
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{parts.join(' · ')}</span>
        </>
      )}
    </>
  );
}

export default function PayrollPage() {
  const {
    draftPayroll,
    employees,
    bonusPackages,
    publicHolidays,
    canWrite,
    generatePayroll,
    updatePayEntry,
    updateCompanySales,
    finalizePayroll,
  } = useApp();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [slipIndex, setSlipIndex] = useState<number | null>(null);

  useEffect(() => {
    if (draftPayroll) {
      setMonth(draftPayroll.month);
      setYear(draftPayroll.year);
    }
  }, [draftPayroll?.id, draftPayroll?.month, draftPayroll?.year]);

  const run = draftPayroll && draftPayroll.month === month && draftPayroll.year === year ? draftPayroll : null;
  const monthHolidays = run?.holidays || [];

  const pkgOf = (entry: PayrollEntry): BonusPackage | undefined =>
    bonusPackages.find((x) => x.id === (entry.packageId || employees.find((e) => e.id === entry.employeeId)?.packageId));

  const flags = useMemo(() => {
    if (!run) return { anySop: false, anyUnit: false, anyBonus: false, anyCompany: false };
    const anySop = run.entries.some((e) => {
      const p = pkgOf(e);
      return p && p.sopEnabled;
    });
    const anyUnit = run.entries.some((e) => {
      const p = pkgOf(e);
      return p && p.perunitEnabled;
    });
    const anyCompany = run.entries.some((e) => {
      const p = pkgOf(e);
      return p && p.companyEnabled;
    });
    const anyBonus = run.entries.some((e) => !!pkgOf(e));
    return { anySop, anyUnit, anyBonus, anyCompany };
  }, [run, bonusPackages, employees]);

  const totals = useMemo(() => {
    if (!run) return null;
    const totalGross = run.entries.reduce((s, e) => s + e.gross, 0);
    const totalNet = run.entries.reduce((s, e) => s + e.netPay, 0);
    const totalCost = run.entries.reduce((s, e) => s + e.employerCost, 0);
    const totalEPFer = run.entries.reduce((s, e) => s + e.epfEmployer, 0);
    const totalSOCSer = run.entries.reduce((s, e) => s + e.socsoEmployer, 0);
    const totalEISer = run.entries.reduce((s, e) => s + e.eisEmployer, 0);
    return { totalGross, totalNet, totalCost, totalEPFer, totalSOCSer, totalEISer };
  }, [run]);

  const handleGenerate = () => {
    generatePayroll(month, year);
  };

  const handleFinalize = async () => {
    if (!run) return;
    if (
      !confirm(
        `Finalize ${PI_MONTHS[run.month]} ${run.year} payroll and post to expenses?`,
      )
    )
      return;
    await finalizePayroll(run.id);
  };

  const slipEntry = slipIndex !== null && run ? run.entries[slipIndex] : null;
  const slipEmp = slipEntry ? employees.find((e) => e.id === slipEntry.employeeId) : undefined;

  const inputStyle: React.CSSProperties = {
    width: 90,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '4px 6px',
    borderRadius: 4,
    fontSize: 12,
  };

  const smallInputStyle: React.CSSProperties = { ...inputStyle, width: 64 };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Run Payroll</h2>
          <div className="sub">EPF · SOCSO · EIS · PCB (MTD) · OT — Malaysia EA 1955</div>
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
          <button type="button" className="btn btn-primary" onClick={handleGenerate}>
            Generate Payroll
          </button>
        </div>
      </div>

      <div id="payrollWorkspace">
        {!run ? (
          <div className="empty" style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            Select month/year and click Generate Payroll
          </div>
        ) : (
          <>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h3>
                {PI_MONTHS[run.month]} {run.year} — {run.status === 'draft' ? 'Draft' : ''} Payroll
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {run.status === 'draft' ? (
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={!canWrite}
                    onClick={handleFinalize}
                  >
                    ✅ Finalize & Post to Expenses
                  </button>
                ) : (
                  <span style={{ color: 'var(--credit)', fontWeight: 600 }}>✅ Finalized</span>
                )}
              </div>
            </div>

            {monthHolidays.length > 0 && (
              <div className="mini-card" style={{ marginBottom: 16, background: 'var(--surface2)' }}>
                <div className="lbl" style={{ marginBottom: 6 }}>
                  🎌 {monthHolidays.length} public holiday(s) this month — record PH days worked per employee under{' '}
                  <strong>Pay Items</strong> (EA 1955: rate × Basic÷26 per day)
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {monthHolidays.map((h) => (
                    <span key={h.id || h.date} className="stat-pill">
                      {h.date} · {h.name} <strong>{h.rate || 1.5}×</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {flags.anyCompany && (
              <div
                className="mini-card"
                style={{
                  marginBottom: 16,
                  background: 'var(--surface2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div className="lbl" style={{ margin: 0 }}>
                  🏢 Company Sales — {PI_MONTHS[run.month]} {run.year}
                </div>
                {run.status === 'draft' ? (
                  <input
                    type="number"
                    step="0.01"
                    value={run.companySales || 0}
                    onChange={(e) => updateCompanySales(parseFloat(e.target.value) || 0)}
                    style={{ ...inputStyle, width: 150 }}
                  />
                ) : (
                  <strong>RM {fmt2(run.companySales || 0)}</strong>
                )}
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Pre-filled from recorded income (credit) — editable. Drives the company-tier bonus.
                </span>
              </div>
            )}

            {totals && (
              <div className="payroll-summary-grid">
                <div className="mini-card">
                  <div className="lbl">Total Gross</div>
                  <div className="val">RM {fmt2(totals.totalGross)}</div>
                </div>
                <div className="mini-card">
                  <div className="lbl">Total Net Pay</div>
                  <div className="val" style={{ color: 'var(--credit)' }}>
                    RM {fmt2(totals.totalNet)}
                  </div>
                </div>
                <div className="mini-card">
                  <div className="lbl">Employer Contributions</div>
                  <div className="val" style={{ color: 'var(--debit)' }}>
                    RM {fmt2(totals.totalCost - totals.totalGross)}
                  </div>
                </div>
                <div className="mini-card">
                  <div className="lbl">Total Employer Cost</div>
                  <div className="val">RM {fmt2(totals.totalCost)}</div>
                </div>
              </div>
            )}

            <div className="table-wrap">
              <div className="table-header">
                <h3>Payroll Details</h3>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {run.entries.length} employee(s) &nbsp;·&nbsp; EPF | SOCSO | EIS | PCB (MTD)
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="pay-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Basic (RM)</th>
                      <th>Attendance</th>
                      <th style={{ color: 'var(--debit)' }}>Unpaid (−)</th>
                      <th>Allowance</th>
                      <th>OT</th>
                      <th>PH Pay</th>
                      <th>Commission</th>
                      {flags.anySop && <th>SOP Score</th>}
                      {flags.anyUnit && <th>Units</th>}
                      {flags.anyBonus && <th>Bonus</th>}
                      <th>Claims</th>
                      <th>Gross</th>
                      <th>EPF (ee)</th>
                      <th>SOCSO (ee)</th>
                      <th>EIS (ee)</th>
                      <th>PCB</th>
                      <th>Total Deduct</th>
                      <th style={{ color: 'var(--credit)' }}>Net Pay</th>
                      <th>EPF (er)</th>
                      <th>SOCSO (er)</th>
                      <th>EIS (er)</th>
                      <th>Total Employer</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.entries.map((e, i) => {
                      const emp = employees.find((x) => x.id === e.employeeId);
                      const pkg = pkgOf(e);
                      const bonusTitle =
                        (e.bonusBreakdown || []).map((b) => `${b.label}: RM ${fmt2(b.amount)}`).join(' | ') ||
                        'No bonus';
                      return (
                        <tr key={e.employeeId}>
                          <td>
                            <strong>{e.employeeName}</strong>
                            <br />
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{e.position || ''}</span>
                          </td>
                          <td>
                            {run.status === 'draft' ? (
                              <input
                                type="number"
                                value={e.basicSalary}
                                step="0.01"
                                style={inputStyle}
                                onChange={(ev) => updatePayEntry(i, 'basicSalary', parseFloat(ev.target.value) || 0)}
                              />
                            ) : (
                              fmt2(e.basicSalary)
                            )}
                            {e.proratedBasic != null && e.proratedBasic < e.basicSalary && (
                              <>
                                <br />
                                <span
                                  style={{ fontSize: 10, color: '#ffc800' }}
                                  title={`EA 1955: Basic ÷ ${e.daysInMonth} × ${e.daysEmployed}`}
                                >
                                  prorated {e.daysEmployed}/{e.daysInMonth} → RM {fmt2(e.proratedBasic)}
                                </span>
                              </>
                            )}
                          </td>
                          <td style={{ fontSize: 11 }}>
                            {attSummary(e, emp, run.year, run.month, publicHolidays)}
                          </td>
                          <td style={{ color: 'var(--debit)' }} title={`${e.unpaidDays || 0} unpaid working day(s) × Basic÷26`}>
                            {e.unpaidAmt ? (
                              <>
                                - RM {fmt2(e.unpaidAmt)}
                                <br />
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{e.unpaidDays}d</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td title="From Pay Items menu">RM {fmt2(e.allowances || 0)}</td>
                          <td title="From Pay Items menu">RM {fmt2(e.otAmt || 0)}</td>
                          <td title="From Pay Items menu">RM {fmt2(e.phPay || 0)}</td>
                          <td>
                            {run.status === 'draft' ? (
                              <input
                                type="number"
                                value={e.commission || 0}
                                step="0.01"
                                style={inputStyle}
                                placeholder="Commission"
                                onChange={(ev) => updatePayEntry(i, 'commission', parseFloat(ev.target.value) || 0)}
                              />
                            ) : (
                              fmt2(e.commission || 0)
                            )}
                          </td>
                          {flags.anySop && (
                            <td>
                              {pkg && pkg.sopEnabled ? (
                                run.status === 'draft' ? (
                                  <input
                                    type="number"
                                    value={e.sopScore || 0}
                                    step="1"
                                    min="0"
                                    style={smallInputStyle}
                                    onChange={(ev) => updatePayEntry(i, 'sopScore', parseFloat(ev.target.value) || 0)}
                                  />
                                ) : (
                                  e.sopScore || 0
                                )
                              ) : (
                                <span style={{ color: 'var(--muted)' }}>—</span>
                              )}
                            </td>
                          )}
                          {flags.anyUnit && (
                            <td>
                              {pkg && pkg.perunitEnabled ? (
                                run.status === 'draft' ? (
                                  <input
                                    type="number"
                                    value={e.units || 0}
                                    step="1"
                                    min="0"
                                    style={smallInputStyle}
                                    title={`${pkg.perunitLabel || 'unit'}s sold`}
                                    onChange={(ev) => updatePayEntry(i, 'units', parseFloat(ev.target.value) || 0)}
                                  />
                                ) : (
                                  e.units || 0
                                )
                              ) : (
                                <span style={{ color: 'var(--muted)' }}>—</span>
                              )}
                            </td>
                          )}
                          {flags.anyBonus && (
                            <td title={bonusTitle} style={{ color: 'var(--credit)' }}>
                              RM {fmt2(e.bonus || 0)}
                            </td>
                          )}
                          <td title="Reimbursements — added to net, exempt from deductions">
                            RM {fmt2(e.claims || 0)}
                          </td>
                          <td style={{ fontWeight: 600 }}>RM {fmt2(e.gross)}</td>
                          <td>RM {fmt2(e.epfEmployee)}</td>
                          <td>RM {fmt2(e.socsoEmployee)}</td>
                          <td>RM {fmt2(e.eisEmployee)}</td>
                          <td>RM {fmt2(e.pcb)}</td>
                          <td style={{ color: 'var(--debit)' }}>RM {fmt2(e.totalDeductions)}</td>
                          <td style={{ color: 'var(--credit)', fontWeight: 700 }}>RM {fmt2(e.netPay)}</td>
                          <td>RM {fmt2(e.epfEmployer)}</td>
                          <td>RM {fmt2(e.socsoEmployer)}</td>
                          <td>RM {fmt2(e.eisEmployer)}</td>
                          <td>RM {fmt2(e.employerCost)}</td>
                          <td>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setSlipIndex(i)}>
                              Slip
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {totals && (
                      <tr className="pay-total-row">
                        <td>TOTAL</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + e.basicSalary, 0))}</td>
                        <td></td>
                        <td style={{ color: 'var(--debit)' }}>
                          - RM {fmt2(run.entries.reduce((s, e) => s + (e.unpaidAmt || 0), 0))}
                        </td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + (e.allowances || 0), 0))}</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + (e.otAmt || 0), 0))}</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + (e.phPay || 0), 0))}</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + (e.commission || 0), 0))}</td>
                        {flags.anySop && <td></td>}
                        {flags.anyUnit && <td></td>}
                        {flags.anyBonus && (
                          <td>RM {fmt2(run.entries.reduce((s, e) => s + (e.bonus || 0), 0))}</td>
                        )}
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + (e.claims || 0), 0))}</td>
                        <td>RM {fmt2(totals.totalGross)}</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + e.epfEmployee, 0))}</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + e.socsoEmployee, 0))}</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + e.eisEmployee, 0))}</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + e.pcb, 0))}</td>
                        <td>RM {fmt2(run.entries.reduce((s, e) => s + e.totalDeductions, 0))}</td>
                        <td style={{ color: 'var(--credit)' }}>RM {fmt2(totals.totalNet)}</td>
                        <td>RM {fmt2(totals.totalEPFer)}</td>
                        <td>RM {fmt2(totals.totalSOCSer)}</td>
                        <td>RM {fmt2(totals.totalEISer)}</td>
                        <td>RM {fmt2(totals.totalCost)}</td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
              💡 <strong>Allowance, Overtime &amp; Public Holiday pay</strong> are recorded per employee under the{' '}
              <strong>Pay Items</strong> menu and pulled in here automatically (subject to EPF/SOCSO/EIS/PCB). Editable
              here: <strong>Basic</strong> and <strong>Commission</strong>.
              <br />
              💵 <strong>Claims/Reimbursements</strong> are added to Net Pay on top of Gross and are exempt from
              statutory deductions.
              <br />
              🗓 <strong>Attendance</strong> shows working days vs leave taken this month. Only <strong>unpaid</strong>{' '}
              leave reduces pay (Basic÷26 per day); annual/medical/other approved leave is paid.
              <br />
              🏆 <strong>Bonus</strong> is computed from the employee&apos;s assigned package (Packages menu). Enter SOP
              score / units per employee; company-tier bonus uses the company sales figure above. Bonuses add to gross
              (subject to statutory deductions). Pro-rated basic (EA 1955) applies to mid-month joiners/leavers.
              <br />
              EPF: Employee 11% / Employer 13% (≤RM5k) or 12% (&gt;RM5k) &nbsp;|&nbsp; SOCSO: 0.5% / 1.75% (cap RM5k)
              &nbsp;|&nbsp; EIS: 0.2% each (cap RM4k) &nbsp;|&nbsp; PCB: progressive MTD
            </div>
          </>
        )}
      </div>

      <Modal
        open={slipIndex !== null && !!slipEntry}
        onClose={() => setSlipIndex(null)}
        title=""
        width={580}
        actions={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setSlipIndex(null)}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              🖨 Print
            </button>
          </>
        }
      >
        {slipEntry && run && (
          <div className="slip-box">
            <div className="slip-header">
              <div>
                <strong style={{ fontSize: 16 }}>PAYSLIP</strong>
                <br />
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {PI_MONTHS[run.month]} {run.year}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{slipEntry.employeeName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {slipEntry.position || ''} &nbsp;·&nbsp; {slipEmp?.employeeId || ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{slipEmp?.ic || ''}</div>
              </div>
            </div>
            <div style={{ fontSize: 13 }}>
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--muted)',
                  fontSize: 11,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                Earnings
              </div>
              {slipEntry.proratedBasic != null && slipEntry.proratedBasic < slipEntry.basicSalary ? (
                <div className="slip-row">
                  <span>
                    Basic Salary (prorated {slipEntry.daysEmployed}/{slipEntry.daysInMonth} days)
                  </span>
                  <span>RM {fmt2(slipEntry.proratedBasic)}</span>
                </div>
              ) : (
                <div className="slip-row">
                  <span>Basic Salary</span>
                  <span>RM {fmt2(slipEntry.basicSalary)}</span>
                </div>
              )}
              {!!slipEntry.allowances && (
                <div className="slip-row">
                  <span>Allowances</span>
                  <span>RM {fmt2(slipEntry.allowances)}</span>
                </div>
              )}
              {!!slipEntry.otAmt && (
                <div className="slip-row">
                  <span>Overtime</span>
                  <span>RM {fmt2(slipEntry.otAmt)}</span>
                </div>
              )}
              {!!slipEntry.phPay && (
                <div className="slip-row">
                  <span>Public Holiday Pay</span>
                  <span>RM {fmt2(slipEntry.phPay)}</span>
                </div>
              )}
              {!!slipEntry.commission && (
                <div className="slip-row">
                  <span>Commission</span>
                  <span>RM {fmt2(slipEntry.commission)}</span>
                </div>
              )}
              {(slipEntry.bonusBreakdown || []).map((b, idx) => (
                <div key={idx} className="slip-row">
                  <span>{b.label}</span>
                  <span>RM {fmt2(b.amount)}</span>
                </div>
              ))}
              {!!slipEntry.unpaidAmt && (
                <div className="slip-row">
                  <span style={{ color: 'var(--debit)' }}>Unpaid Leave ({slipEntry.unpaidDays}d)</span>
                  <span style={{ color: 'var(--debit)' }}>- RM {fmt2(slipEntry.unpaidAmt)}</span>
                </div>
              )}
              <hr className="slip-divider" />
              <div className="slip-row">
                <span style={{ fontWeight: 600 }}>Gross Salary</span>
                <span style={{ fontWeight: 600 }}>RM {fmt2(slipEntry.gross)}</span>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--muted)',
                  fontSize: 11,
                  margin: '12px 0 6px',
                  textTransform: 'uppercase',
                }}
              >
                Deductions
              </div>
              <div className="slip-row">
                <span>EPF (Employee 11%)</span>
                <span style={{ color: 'var(--debit)' }}>- RM {fmt2(slipEntry.epfEmployee)}</span>
              </div>
              <div className="slip-row">
                <span>SOCSO (Employee)</span>
                <span style={{ color: 'var(--debit)' }}>- RM {fmt2(slipEntry.socsoEmployee)}</span>
              </div>
              <div className="slip-row">
                <span>EIS (Employee 0.2%)</span>
                <span style={{ color: 'var(--debit)' }}>- RM {fmt2(slipEntry.eisEmployee)}</span>
              </div>
              <div className="slip-row">
                <span>PCB / MTD (Tax)</span>
                <span style={{ color: 'var(--debit)' }}>- RM {fmt2(slipEntry.pcb)}</span>
              </div>
              <hr className="slip-divider" />
              <div className="slip-row slip-total">
                <span>NET PAY</span>
                <span style={{ color: 'var(--credit)' }}>RM {fmt2(slipEntry.netPay)}</span>
              </div>
              {!!slipEntry.claims && (
                <>
                  <div className="slip-row">
                    <span>Claims / Reimbursement (exempt)</span>
                    <span>+ RM {fmt2(slipEntry.claims)}</span>
                  </div>
                  <div className="slip-row slip-total">
                    <span>TOTAL PAYOUT</span>
                    <span style={{ color: 'var(--credit)' }}>
                      RM {fmt2(Math.round((slipEntry.netPay + slipEntry.claims) * 100) / 100)}
                    </span>
                  </div>
                </>
              )}
              {slipEntry.attendance && slipEntry.attendance.total > 0 && (
                <>
                  <div
                    style={{
                      fontWeight: 700,
                      color: 'var(--muted)',
                      fontSize: 11,
                      margin: '12px 0 6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Attendance / Leave This Month
                  </div>
                  {Object.keys(LEAVE_LABELS)
                    .filter((k) => (slipEntry.attendance[k] || 0) > 0)
                    .map((k) => (
                      <div key={k} className="slip-row">
                        <span>{LEAVE_LABELS[k]} Leave</span>
                        <span>{slipEntry.attendance[k]} day(s)</span>
                      </div>
                    ))}
                </>
              )}
              <hr className="slip-divider" style={{ marginTop: 12 }} />
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--muted)',
                  fontSize: 11,
                  margin: '12px 0 6px',
                  textTransform: 'uppercase',
                }}
              >
                Employer Contributions (not deducted)
              </div>
              <div className="slip-row">
                <span>EPF (Employer {slipEntry.gross > 5000 ? '12' : '13'}%)</span>
                <span>RM {fmt2(slipEntry.epfEmployer)}</span>
              </div>
              <div className="slip-row">
                <span>SOCSO (Employer)</span>
                <span>RM {fmt2(slipEntry.socsoEmployer)}</span>
              </div>
              <div className="slip-row">
                <span>EIS (Employer 0.2%)</span>
                <span>RM {fmt2(slipEntry.eisEmployer)}</span>
              </div>
              <div className="slip-row" style={{ fontWeight: 600, marginTop: 4 }}>
                <span>Total Employer Cost</span>
                <span>RM {fmt2(slipEntry.employerCost)}</span>
              </div>
              <div
                style={{
                  marginTop: 16,
                  fontSize: 11,
                  color: 'var(--muted)',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 10,
                }}
              >
                Bank: {slipEmp?.bank || '—'} &nbsp;|&nbsp; Account: {slipEmp?.bankAcc || '—'}
                <br />
                EPF No: {slipEmp?.epfNo || '—'} &nbsp;|&nbsp; SOCSO No: {slipEmp?.socsoNo || '—'} &nbsp;|&nbsp; Tax
                No: {slipEmp?.taxNo || '—'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
