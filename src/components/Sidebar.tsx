import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PROVIDER_DEFAULTS } from '../lib/config';

const NAV_ITEMS = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/ledger', icon: '📋', label: 'Transaction Ledger' },
  { to: '/upload', icon: '📤', label: 'Upload / Import' },
  { to: '/entry', icon: '✏️', label: 'Manual Entry' },
  { to: '/reports', icon: '📈', label: 'Reports & P&L' },
];

const PAYROLL_NAV = [
  { to: '/employees', icon: '👤', label: 'Employees' },
  { to: '/leave', icon: '🗓', label: 'Leave' },
  { to: '/payitems', icon: '➕', label: 'Pay Items' },
  { to: '/packages', icon: '🏆', label: 'Packages' },
  { to: '/payroll', icon: '💵', label: 'Run Payroll' },
  { to: '/payhistory', icon: '🗂', label: 'Pay History' },
];

export default function Sidebar() {
  const {
    transactions,
    llmSettings,
    sbUrl,
    sbKey,
    syncDetail,
    canWrite,
    llmTestStatus,
    saveLLMSettings,
    onProviderChange,
    testLLM,
    saveSbConfigFromInputs,
    connectSupabase,
    resync,
    diag,
    logout,
  } = useApp();

  const isClaude = llmSettings.provider === 'claude';
  const keyOptional = !PROVIDER_DEFAULTS[llmSettings.provider].keyRequired;

  return (
    <aside className="sidebar">
      <div className="logo">
        <h1>💰 Moja Finance</h1>
        <p>Finance Agent v1.0</p>
      </div>
      <nav>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{item.icon}</span> {item.label}
          </NavLink>
        ))}
        <div className="nav-section-label">Payroll</div>
        {PAYROLL_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{item.icon}</span> {item.label}
          </NavLink>
        ))}
      </nav>

      <hr className="llm-divider" />

      <div className="api-section">
        <label>AI Provider</label>
        <select
          value={llmSettings.provider}
          onChange={(e) => onProviderChange(e.target.value as typeof llmSettings.provider)}
        >
          <option value="claude">☁ Claude (Anthropic)</option>
          <option value="ollama">🖥 Ollama (local)</option>
          <option value="lmstudio">🖥 LM Studio (local)</option>
          <option value="openai-compat">🔧 Custom OpenAI-compat</option>
        </select>
      </div>
      <div className="api-section">
        <label>Model name</label>
        <input
          type="text"
          placeholder="e.g. qwen2-vl, gemma3"
          value={llmSettings.model}
          onChange={(e) => saveLLMSettings({ model: e.target.value })}
        />
      </div>
      {!isClaude && (
        <div className="api-section">
          <label>Base URL</label>
          <input
            type="text"
            placeholder="http://localhost:11434"
            value={llmSettings.base}
            onChange={(e) => saveLLMSettings({ base: e.target.value })}
          />
        </div>
      )}
      <div className="api-section">
        <label>
          API Key{' '}
          {keyOptional && (
            <span style={{ color: 'var(--muted)', fontSize: 10 }}>(optional for local)</span>
          )}
        </label>
        <input
          type="password"
          placeholder={isClaude ? 'sk-ant-...' : 'optional'}
          value={llmSettings.key}
          onChange={(e) => saveLLMSettings({ key: e.target.value })}
        />
      </div>
      <div style={{ padding: '4px 20px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => testLLM()}>
          🔌 Test LLM Connection
        </button>
        <div style={{ fontSize: 11, textAlign: 'center', minHeight: 16, color: llmTestStatus.startsWith('✔') ? 'var(--credit)' : llmTestStatus.startsWith('✘') ? 'var(--debit)' : 'var(--muted)' }}>
          {llmTestStatus}
        </div>
      </div>

      <hr className="llm-divider" />

      <div className="api-section">
        <label>☁ Supabase URL</label>
        <input
          type="text"
          placeholder="https://xxx.supabase.co"
          value={sbUrl}
          onChange={(e) => saveSbConfigFromInputs(e.target.value, sbKey)}
        />
      </div>
      <div className="api-section">
        <label>Supabase Anon Key</label>
        <input
          type="password"
          placeholder="eyJ..."
          value={sbKey}
          onChange={(e) => saveSbConfigFromInputs(sbUrl, e.target.value)}
        />
      </div>
      <div style={{ padding: '4px 20px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => connectSupabase()}>
          Connect & Sync
        </button>
        <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => resync()} disabled={!canWrite}>
          ↕ Resync (Push & Pull)
        </button>
        <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => diag()}>
          🔍 Diagnose
        </button>
      </div>

      <div className="sidebar-footer">
        <div>
          <span>{transactions.length}</span> transactions
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>{syncDetail}</div>
        <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 10, fontSize: 12 }} onClick={() => logout()}>
          🔒 Sign Out
        </button>
      </div>
    </aside>
  );
}
