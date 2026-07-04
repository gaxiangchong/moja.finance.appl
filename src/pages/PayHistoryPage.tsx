import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PI_MONTHS } from '../lib/config';
import { fmt2 } from '../lib/format';

export default function PayHistoryPage() {
  const { payrollRuns, setDraftPayroll } = useApp();
  const navigate = useNavigate();

  const finalized = [...payrollRuns]
    .filter((r) => r.status === 'finalized')
    .sort((a, b) => b.year - a.year || b.month - a.month);

  const viewRun = (id: string) => {
    const run = payrollRuns.find((r) => r.id === id);
    if (!run) return;
    setDraftPayroll(run);
    navigate('/payroll');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Payroll History</h2>
          <div className="sub">Finalized payroll runs posted to company expenses</div>
        </div>
      </div>

      <div id="payHistoryList">
        {!finalized.length ? (
          <div className="empty" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
            No finalized payroll runs yet
          </div>
        ) : (
          finalized.map((run) => (
            <div key={run.id} className="emp-card" style={{ cursor: 'default' }}>
              <div className="emp-avatar" style={{ background: 'var(--accent2)', fontSize: 12 }}>
                PAY
              </div>
              <div className="emp-info">
                <div className="emp-name">
                  {PI_MONTHS[run.month]} {run.year}
                </div>
                <div className="emp-sub">
                  {run.entries.length} employees &nbsp;·&nbsp; Processed {run.processedDate}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="stat-pill">Gross: RM {fmt2(run.totalGross)}</span>
                  <span className="stat-pill" style={{ color: 'var(--credit)' }}>
                    Net: RM {fmt2(run.totalNet)}
                  </span>
                  <span className="stat-pill" style={{ color: 'var(--debit)' }}>
                    Total Cost: RM {fmt2(run.totalCost)}
                  </span>
                </div>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => viewRun(run.id)}>
                View
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
