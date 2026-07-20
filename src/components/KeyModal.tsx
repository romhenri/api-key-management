import React, { useState, useEffect } from 'react';
import { ApiKeyData } from '../services/gemini';
import { Tier } from '../services/quota';
import { Provider, PROVIDERS, PROVIDER_LABELS } from '../services/providers';
import TagSelector from './TagSelector';

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: { key: string; label: string; notes?: string; tier?: Tier; tags?: string[]; provider?: Provider }[]) => void;
  editingKey?: ApiKeyData | null;
}

export default function KeyModal({ isOpen, onClose, onSave, editingKey }: KeyModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>(editingKey ? 'single' : 'single');
  const [singleKey, setSingleKey] = useState(editingKey ? editingKey.key : '');
  const [singleLabel, setSingleLabel] = useState(editingKey ? editingKey.label : '');
  const [singleNotes, setSingleNotes] = useState(editingKey ? editingKey.notes || '' : '');
  const [singleTier, setSingleTier] = useState<Tier>(editingKey?.tier ?? 'unknown');
  const [singleProvider, setSingleProvider] = useState<Provider>(editingKey?.provider ?? 'gemini');
  const [singleTags, setSingleTags] = useState<string[]>(editingKey?.tags ?? []);
  const [bulkText, setBulkText] = useState('');
  const [bulkProvider, setBulkProvider] = useState<Provider>('gemini');

  // The modal stays mounted, so useState initializers only run once. Re-seed the
  // form with the target key's current info every time it opens (or the key changes).
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('single');
    setSingleKey(editingKey?.key ?? '');
    setSingleLabel(editingKey?.label ?? '');
    setSingleNotes(editingKey?.notes ?? '');
    setSingleTier(editingKey?.tier ?? 'unknown');
    setSingleProvider(editingKey?.provider ?? 'gemini');
    setSingleTags(editingKey?.tags ?? []);
    setBulkText('');
    setBulkProvider('gemini');
  }, [isOpen, editingKey]);

  if (!isOpen) return null;

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleKey.trim()) return;

    onSave([{
      key: singleKey.trim(),
      label: singleLabel.trim() || 'Unnamed key',
      notes: singleNotes.trim(),
      tier: singleTier,
      tags: singleTags,
      provider: singleProvider
    }]);

    // Reset
    setSingleKey('');
    setSingleLabel('');
    setSingleNotes('');
    setSingleTier('unknown');
    setSingleProvider('gemini');
    setSingleTags([]);
    onClose();
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n');
    const parsedKeys: { key: string; label: string; notes?: string; provider?: Provider }[] = [];

    lines.forEach((line, index) => {
      let trimmed = line.trim();
      if (!trimmed) return;

      // Skip .env comment lines
      if (trimmed.startsWith('#')) return;

      // Allow an optional `export ` prefix, common in shell/.env files
      trimmed = trimmed.replace(/^export\s+/, '');

      let key = trimmed;
      let label = '';

      // .env format: VARIABLE_NAME=AIzaSy... — the variable name becomes the label.
      // Matches before other delimiters so a line like NON_LLM_API_KEY=... is read as env.
      const envMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.+)$/);

      if (envMatch) {
        label = envMatch[1].trim();
        // Strip surrounding single/double quotes commonly found in .env values
        key = envMatch[2].trim().replace(/^["']|["']$/g, '').trim();
      } else if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        key = parts[0].trim();
        label = parts[1].trim();
      } else if (trimmed.includes(';')) {
        const parts = trimmed.split(';');
        key = parts[0].trim();
        label = parts[1].trim();
      } else {
        // Fallback: split by space/tab if key is 39 characters
        // Valid API key is usually around 39 chars. Let's just check if there's a space.
        const firstSpaceIdx = trimmed.indexOf(' ');
        if (firstSpaceIdx !== -1) {
          key = trimmed.substring(0, firstSpaceIdx).trim();
          label = trimmed.substring(firstSpaceIdx + 1).trim();
        }
      }

      if (key) {
        parsedKeys.push({
          key,
          label: label || `Batch Key ${index + 1}`,
          notes: 'Bulk imported',
          provider: bulkProvider
        });
      }
    });

    if (parsedKeys.length > 0) {
      onSave(parsedKeys);
    }

    setBulkText('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {editingKey ? 'Edit API Key' : 'Add API Keys'}
          </h2>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          {/* Tabs - Only show when NOT editing a key */}
          {!editingKey && (
            <div className="tabs-container" style={{ marginBottom: '24px' }}>
              <button
                className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
                onClick={() => setActiveTab('single')}
              >
                Single Key
              </button>
              <button
                className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
                onClick={() => setActiveTab('bulk')}
              >
                Bulk Import
              </button>
            </div>
          )}

          {activeTab === 'single' || editingKey ? (
            <form onSubmit={handleSingleSubmit}>
              <div className="form-group">
                <label htmlFor="key">API Key</label>
                <input
                  id="key"
                  type="password"
                  className="input-text"
                  placeholder="Paste the provider's API key..."
                  value={singleKey}
                  onChange={(e) => setSingleKey(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="label">Nickname / Label</label>
                <input
                  id="label"
                  type="text"
                  className="input-text"
                  placeholder="e.g. Main Project, Dev Sandbox, etc."
                  value={singleLabel}
                  onChange={(e) => setSingleLabel(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="provider">Provider</label>
                <select
                  id="provider"
                  className="select-input"
                  value={singleProvider}
                  onChange={(e) => setSingleProvider(e.target.value as Provider)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tier">Billing Plan (for quota estimates)</label>
                <select
                  id="tier"
                  className="select-input"
                  value={singleTier}
                  onChange={(e) => setSingleTier(e.target.value as Tier)}
                >
                  <option value="unknown">Unknown</option>
                  <option value="free">Free (Free Tier)</option>
                  <option value="paid">Paid (Pay-As-You-Go)</option>
                </select>
              </div>

              {editingKey && (
                <div className="form-group">
                  <label>Current Status</label>
                  <div>
                    {editingKey.status === 'valid' && (
                      <span className="badge badge-valid"><span className="status-dot status-dot-active"></span>Valid</span>
                    )}
                    {editingKey.status === 'invalid' && (
                      <span className="badge badge-invalid"><span className="status-dot status-dot-inactive"></span>Invalid</span>
                    )}
                    {editingKey.status === 'untested' && (
                      <span className="badge badge-untested"><span className="status-dot status-dot-untested"></span>Untested</span>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)', marginLeft: '8px' }}>
                      (reset to "Untested" if the key is changed)
                    </span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Tags / Classification</label>
                <TagSelector value={singleTags} onChange={setSingleTags} />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes / Remarks (Optional)</label>
                <textarea
                  id="notes"
                  className="textarea-input"
                  rows={3}
                  placeholder="e.g. Created in July 2026 for testing..."
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '16px 0 0 0', background: 'transparent' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingKey ? 'Salvar Alterações' : 'Adicionar Chave'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleBulkSubmit}>
              <div style={{
                background: 'var(--surface-3)',
                borderLeft: '4px solid var(--primary)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                fontSize: '13px',
                color: 'var(--ink-muted)'
              }}>
                Cole uma chave por linha. Aceita o formato <strong>.env</strong> (<code style={{ fontFamily: 'var(--font-mono)' }}>NOME=chave</code>, o nome vira o apelido) ou um apelido opcional separado por <strong>|</strong>, <strong>espaço</strong> ou <strong>ponto e vírgula</strong>. Linhas iniciadas com <strong>#</strong> são ignoradas.
                <code style={{ display: 'block', marginTop: '8px', color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                  NON_LLM_API_KEY=AIzaSy_ExemploChave1<br />
                  GEMINI_API_KEY=AIzaSy_ExemploChave2<br />
                  AIzaSy_ExemploChave3 | Sandbox Dev
                </code>
              </div>

              <div className="form-group">
                <label htmlFor="bulkProvider">Provider (applies to all keys below)</label>
                <select
                  id="bulkProvider"
                  className="select-input"
                  value={bulkProvider}
                  onChange={(e) => setBulkProvider(e.target.value as Provider)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="bulkText">Lista de Chaves</label>
                <textarea
                  id="bulkText"
                  className="textarea-input"
                  rows={8}
                  placeholder="Cole as chaves aqui..."
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  required
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div className="modal-footer" style={{ padding: '16px 0 0 0', background: 'transparent' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Importar Chaves
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
