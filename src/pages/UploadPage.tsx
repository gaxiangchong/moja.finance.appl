import { useCallback, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { extractFromFile, getLLMConfig } from '../lib/llm';
import type { ExtractedTransaction, PaymentClass, TransactionType } from '../lib/types';
import { uid } from '../lib/utils';

interface ExtractedBatch {
  id: string;
  filename: string;
  status: 'processing' | 'done' | 'error' | 'imported';
  error?: string;
  items: ExtractedTransaction[];
  pclass: PaymentClass;
  staffName: string;
  defaultCat: string;
}

export default function UploadPage() {
  const { categories, llmSettings, canWrite, importTransactions, addCategory, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pclass, setPclass] = useState<PaymentClass>('bill');
  const [staffName, setStaffName] = useState('');
  const [uploadCat, setUploadCat] = useState(categories[0] || 'Other');
  const [dragging, setDragging] = useState(false);
  const [batches, setBatches] = useState<ExtractedBatch[]>([]);

  const pclassHint =
    pclass === 'bill' ? (
      <>
        🧾 <strong style={{ color: 'var(--debit)' }}>Bill to Company</strong> — direct vendor / supplier invoice charged to
        the company.
      </>
    ) : (
      <>
        💼 <strong style={{ color: 'var(--accent2)' }}>Reimbursement to Staff</strong> — staff paid out of pocket and is
        owed by the company.
      </>
    );

  const handleAddCategory = () => {
    const name = (prompt('New category name:') || '').trim();
    if (!name) return;
    if (addCategory(name)) setUploadCat(name);
  };

  const processFile = useCallback(
    async (file: File) => {
      const cfg = getLLMConfig(llmSettings);
      if (cfg.provider === 'claude' && !cfg.key) {
        showToast('Please enter your Claude API key in the sidebar', 'error');
        return;
      }

      const batchId = uid();
      const newBatch: ExtractedBatch = {
        id: batchId,
        filename: file.name,
        status: 'processing',
        items: [],
        pclass,
        staffName: staffName.trim(),
        defaultCat: uploadCat || 'Other',
      };
      setBatches((prev) => [...prev, newBatch]);

      try {
        const result = await extractFromFile({
          file,
          cfg,
          pclass,
          staffName: staffName.trim(),
          defaultCat: uploadCat || 'Other',
        });
        setBatches((prev) =>
          prev.map((b) =>
            b.id === batchId ? { ...b, status: 'done', items: result.items } : b,
          ),
        );
        showToast(`Extracted ${result.items.length} transactions from ${file.name}`, 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setBatches((prev) =>
          prev.map((b) => (b.id === batchId ? { ...b, status: 'error', error: msg } : b)),
        );
        showToast('Error: ' + msg, 'error');
      }
    },
    [llmSettings, pclass, staffName, uploadCat, showToast],
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of files) {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        processFile(file);
      }
    }
  };

  const updateItem = (batchId: string, idx: number, field: keyof ExtractedTransaction, value: string | number) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        const items = [...b.items];
        items[idx] = { ...items[idx], [field]: value };
        return { ...b, items };
      }),
    );
  };

  const discardBatch = (batchId: string) => {
    setBatches((prev) => prev.filter((b) => b.id !== batchId));
  };

  const importBatch = async (batch: ExtractedBatch) => {
    const txs = batch.items
      .filter((item) => item.date && item.amount && item.description)
      .map((item) => ({
        date: item.date,
        amount: item.amount,
        type: (item.type || 'debit') as TransactionType,
        account: item.account || '',
        description: item.description,
        category: item.category || batch.defaultCat || 'Other',
        notes: item.notes || '',
        ref: '',
        paymentClass: batch.pclass,
        staffName: batch.staffName,
        source: 'ai-extracted' as const,
      }));
    if (!txs.length) {
      showToast('Nothing to import', 'error');
      return;
    }
    const ok = await importTransactions(txs);
    if (ok) {
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, status: 'imported' } : b)),
      );
      setTimeout(() => discardBatch(batch.id), 2000);
    }
  };

  const providerLabel =
    llmSettings.provider === 'claude' ? 'Claude' : llmSettings.model || llmSettings.provider;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Upload & Import</h2>
          <div className="sub">Upload screenshots or PDF statements — AI will extract transactions</div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          What type of payment is this?
        </div>
        <div className="pclass-row">
          <button
            type="button"
            className={`pclass-btn${pclass === 'bill' ? ' selected-bill' : ''}`}
            onClick={() => setPclass('bill')}
          >
            <span className="pclass-icon">🧾</span>
            Bill to Company
            <span className="pclass-sub">Vendor invoice / company expense</span>
          </button>
          <button
            type="button"
            className={`pclass-btn${pclass === 'reimbursement' ? ' selected-reimb' : ''}`}
            onClick={() => setPclass('reimbursement')}
          >
            <span className="pclass-icon">💼</span>
            Reimbursement to Staff
            <span className="pclass-sub">Staff paid out of pocket</span>
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{pclassHint}</div>
        {pclass === 'reimbursement' && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              Staff name (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Alice Tan"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '8px 12px',
                borderRadius: 7,
                fontSize: 13,
                width: 260,
              }}
            />
          </div>
        )}
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              display: 'block',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Category for this upload
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={uploadCat}
              onChange={(e) => setUploadCat(e.target.value)}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '8px 12px',
                borderRadius: 7,
                fontSize: 13,
                minWidth: 260,
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleAddCategory}>
              + New Category
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            All rows extracted from this upload will be categorised under this category (you can still change any row
            before importing).
          </div>
        </div>
      </div>

      <div
        className={`upload-area${dragging ? ' drag' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="icon">📎</div>
        <h3>Drop files here or click to browse</h3>
        <p>
          Supports PNG, JPG, JPEG, PDF &nbsp;•&nbsp; Select provider in sidebar ({providerLabel})
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div id="extractedList">
        {batches.map((batch) => {
          if (batch.status === 'processing') {
            return (
              <div key={batch.id} className="processing">
                <h4>
                  <span className="spinner" /> Processing <em>{batch.filename}</em> with {providerLabel}...
                </h4>
              </div>
            );
          }
          if (batch.status === 'error') {
            return (
              <div key={batch.id} className="processing">
                <h4 style={{ color: 'var(--debit)' }}>❌ Failed: {batch.filename}</h4>
                <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>{batch.error}</p>
              </div>
            );
          }
          if (batch.status === 'imported') {
            return (
              <div key={batch.id} className="processing">
                <h4 style={{ color: 'var(--credit)' }}>✅ {batch.items.length} transactions imported!</h4>
              </div>
            );
          }
          if (!batch.items.length) {
            return (
              <div key={batch.id} className="processing">
                <h4>⚠ No transactions found in {batch.filename}</h4>
              </div>
            );
          }

          const pclassLabel =
            batch.pclass === 'reimbursement'
              ? `💼 Reimbursement${batch.staffName ? ' · ' + batch.staffName : ''}`
              : '🧾 Bill to Company';
          const pclassColor = batch.pclass === 'reimbursement' ? 'var(--accent2)' : 'var(--debit)';

          return (
            <div key={batch.id} className="processing">
              <h4 style={{ marginBottom: 8 }}>
                ✅ Found {batch.items.length} transaction(s) in <em>{batch.filename}</em>
              </h4>
              <div style={{ fontSize: 12, color: pclassColor, marginBottom: 12 }}>
                Tagged as: <strong>{pclassLabel}</strong>
              </div>
              {batch.items.map((item, i) => (
                <div key={i} className="extracted-item">
                  <div className="ei-info">
                    <div className="ei-row">
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateItem(batch.id, i, 'date', e.target.value)}
                      />
                      <input
                        type="text"
                        value={item.description}
                        placeholder="Description"
                        style={{ flex: 2 }}
                        onChange={(e) => updateItem(batch.id, i, 'description', e.target.value)}
                      />
                      <input
                        type="number"
                        value={item.amount}
                        step="0.01"
                        placeholder="Amount"
                        style={{ maxWidth: 110 }}
                        onChange={(e) => updateItem(batch.id, i, 'amount', parseFloat(e.target.value) || 0)}
                      />
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(batch.id, i, 'type', e.target.value)}
                      >
                        <option value="debit">Debit</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>
                    <div className="ei-row">
                      <input
                        type="text"
                        value={item.account || ''}
                        placeholder="Account"
                        onChange={(e) => updateItem(batch.id, i, 'account', e.target.value)}
                      />
                      <select
                        value={item.category || batch.defaultCat}
                        onChange={(e) => updateItem(batch.id, i, 'category', e.target.value)}
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.notes || ''}
                        placeholder="Notes / Ref"
                        style={{ flex: 2 }}
                        onChange={(e) => updateItem(batch.id, i, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={!canWrite}
                  onClick={() => importBatch(batch)}
                >
                  Import All ({batch.items.length})
                </button>
                <button type="button" className="btn btn-outline" onClick={() => discardBatch(batch.id)}>
                  Discard
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
