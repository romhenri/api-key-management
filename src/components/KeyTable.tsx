import { useState } from 'react';
import { ApiKeyData } from '../services/gemini';
import { Tier } from '../services/quota';
import KeyDetailModal from './KeyDetailModal';
import { SUGGESTED_TAGS } from './TagSelector';
import { IconInfo, IconRefresh, IconZap, IconArchive, IconRestore, IconCopy, IconCheckMark, IconTrash, IconEdit } from './icons';

interface KeyTableProps {
  keys: ApiKeyData[];
  onCheck: (id: string) => void;
  onEdit: (key: ApiKeyData) => void;
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
  onOpenTester: (key: ApiKeyData) => void;
  onSetTier: (id: string, tier: Tier) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  selectedIds: string[];
  onSelectKey: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  checkingIds: string[];
}

export default function KeyTable({
  keys,
  onCheck,
  onEdit,
  onArchive,
  onDelete,
  onOpenTester,
  onSetTier,
  onUpdateTags,
  selectedIds,
  onSelectKey,
  onSelectAll,
  checkingIds
}: KeyTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState('');

  const isLimitTag = (tag: string) => tag.toLowerCase().includes('limit');

  const commitTag = (k: ApiKeyData) => {
    const t = tagDraft.trim();
    if (t && !(k.tags || []).includes(t)) {
      onUpdateTags(k.id, [...(k.tags || []), t]);
    }
    setEditingTagsId(null);
    setTagDraft('');
  };

  const removeTag = (k: ApiKeyData, tag: string) => {
    onUpdateTags(k.id, (k.tags || []).filter((x) => x !== tag));
  };

  const copyToClipboard = (id: string, keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskKey = (keyStr: string) => {
    if (keyStr.length <= 10) return keyStr;
    return `${keyStr.substring(0, 6)}...${keyStr.substring(keyStr.length - 4)}`;
  };

  const allSelected = keys.length > 0 && selectedIds.length === keys.length;
  const viewingKey = keys.find((k) => k.id === viewingId) || null;

  return (
    <div className="table-container">
      {keys.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink)' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No API keys added yet.</p>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)' }}>
            Click the "Add Key" button at the top to get started.
          </p>
        </div>
      ) : (
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th>Label</th>
              <th>API Key</th>
              <th>Status</th>
              <th style={{ minWidth: '120px', width: 'auto' }}>Tags</th>
              <th>Models</th>
              <th>Last Checked</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const isChecking = checkingIds.includes(k.id);
              const isSelected = selectedIds.includes(k.id);

              return (
                <tr key={k.id} className={isSelected ? 'selected-row' : ''} style={{
                  backgroundColor: isSelected ? 'rgba(88, 101, 242, 0.08)' : 'transparent',
                  transition: 'background-color var(--duration-base) var(--easing)'
                }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onSelectKey(k.id, e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => setViewingId(k.id)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-sans)',
                        fontSize: '15px', textAlign: 'left'
                      }}
                      title="View key details"
                    >
                      {k.label}
                    </button>
                    {k.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {k.notes}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex-center">
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--ink-muted)' }}>
                        {maskKey(k.key)}
                      </code>
                      <button
                        className="btn btn-ghost btn-xs btn-icon"
                        onClick={() => copyToClipboard(k.id, k.key)}
                        title={copiedId === k.id ? 'Copied!' : 'Copy key'}
                        style={copiedId === k.id ? { color: 'var(--secondary)' } : undefined}
                      >
                        {copiedId === k.id ? <IconCheckMark /> : <IconCopy />}
                      </button>
                    </div>
                  </td>
                  <td>
                    {k.status === 'valid' && (
                      <span className="badge badge-valid">
                        <span className="status-dot status-dot-active"></span>
                        Valid
                      </span>
                    )}
                    {k.status === 'invalid' && (
                      <span className="badge badge-invalid">
                        <span className="status-dot status-dot-inactive"></span>
                        Invalid
                      </span>
                    )}
                    {k.status === 'untested' && (
                      <span className="badge badge-untested">
                        <span className="status-dot status-dot-untested"></span>
                        Untested
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', minWidth: '110px' }}>
                      {(k.tags || []).map((tag) => (
                        <span key={tag} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', fontWeight: 600, padding: '2px 4px 2px 8px', borderRadius: '999px',
                          background: isLimitTag(tag) ? 'var(--error-bg)' : 'var(--surface-2)',
                          color: isLimitTag(tag) ? 'var(--dnd)' : 'var(--ink-muted)',
                          border: `1px solid ${isLimitTag(tag) ? 'var(--error-border)' : 'var(--surface-3)'}`
                        }}>
                          {tag}
                          <button
                            onClick={() => removeTag(k, tag)}
                            title="Remove tag"
                            style={{
                              border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                              color: 'inherit', fontSize: '13px', lineHeight: 1, opacity: 0.7
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      {editingTagsId === k.id ? (
                        <input
                          autoFocus
                          list="tag-suggestions"
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitTag(k); }
                            else if (e.key === 'Escape') { setEditingTagsId(null); setTagDraft(''); }
                          }}
                          onBlur={() => commitTag(k)}
                          placeholder="tag..."
                          style={{
                            width: '80px', fontSize: '12px', padding: '2px 6px',
                            background: 'var(--surface-2)', color: 'var(--ink)',
                            border: '1px solid var(--primary)', borderRadius: '999px'
                          }}
                        />
                      ) : (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => { setEditingTagsId(k.id); setTagDraft(''); }}
                          title="Add tag"
                          style={{ padding: '2px 6px' }}
                        >
                          + Tag
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    {k.status === 'valid' ? (
                      <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '13px' }}>
                        {k.models.length}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>-</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>
                    {k.lastChecked ? new Date(k.lastChecked).toLocaleString('en-US') : 'Never'}
                  </td>
                  <td>
                    <div className="flex-center" style={{ justifyContent: 'flex-end', gap: '4px' }}>
                      <button
                        className="btn btn-ghost btn-xs btn-icon"
                        onClick={() => setViewingId(k.id)}
                        title="View details"
                      >
                        <IconInfo />
                      </button>
                      <button
                        className="btn btn-secondary btn-xs btn-icon"
                        onClick={() => onCheck(k.id)}
                        disabled={isChecking}
                        title="Check key status"
                      >
                        {isChecking ? (
                          <span className="spinner" style={{ width: '12px', height: '12px' }}></span>
                        ) : (
                          <IconRefresh />
                        )}
                      </button>

                      <button
                        className="btn btn-secondary btn-xs btn-icon"
                        onClick={() => onOpenTester(k)}
                        disabled={k.status !== 'valid'}
                        title="Test a request in the console"
                      >
                        <IconZap />
                      </button>

                      <button
                        className="btn btn-ghost btn-xs btn-icon"
                        onClick={() => onEdit(k)}
                        title="Edit key"
                      >
                        <IconEdit />
                      </button>

                      <button
                        className="btn btn-ghost btn-xs btn-icon"
                        onClick={() => onArchive(k.id, !k.archived)}
                        title={k.archived ? 'Restore key' : 'Archive key'}
                      >
                        {k.archived ? <IconRestore /> : <IconArchive />}
                      </button>

                      <button
                        className="btn btn-ghost btn-xs btn-icon"
                        onClick={() => onDelete(k.id)}
                        title="Delete permanently (irreversible)"
                        style={{ color: 'var(--dnd)' }}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <datalist id="tag-suggestions">
        {SUGGESTED_TAGS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <KeyDetailModal
        keyData={viewingKey}
        onClose={() => setViewingId(null)}
        onSetTier={onSetTier}
        onOpenTester={(key) => { setViewingId(null); onOpenTester(key); }}
        onEdit={(key) => { setViewingId(null); onEdit(key); }}
      />
    </div>
  );
}
