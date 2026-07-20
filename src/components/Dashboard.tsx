import { useState } from 'react';
import { ApiKeyData } from '../services/gemini';
import { Tier } from '../services/quota';
import { Provider, PROVIDERS, PROVIDER_LABELS } from '../services/providers';
import KeyTable from './KeyTable';

interface DashboardProps {
  keys: ApiKeyData[];
  onCheckKey: (id: string) => void;
  onCheckBulk: (ids: string[]) => void;
  onEditKey: (key: ApiKeyData) => void;
  onArchiveKey: (id: string, archived: boolean) => void;
  onArchiveBulk: (ids: string[], archived: boolean) => void;
  onDeleteKey: (id: string) => void;
  onAddKeyClick: () => void;
  onOpenTester: (key: ApiKeyData) => void;
  onSetTier: (id: string, tier: Tier) => void;
  onSetProvider: (id: string, provider: Provider) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onClassifyDuplicates: () => void;
  checkingIds: string[];
}

export default function Dashboard({
  keys,
  onCheckKey,
  onCheckBulk,
  onEditKey,
  onArchiveKey,
  onArchiveBulk,
  onDeleteKey,
  onAddKeyClick,
  onOpenTester,
  onSetTier,
  onSetProvider,
  onUpdateTags,
  onClassifyDuplicates,
  checkingIds
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'untested' | 'archived'>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | Provider>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const viewingArchived = statusFilter === 'archived';

  // Count metrics (active = not archived)
  const activeKeys = keys.filter((k) => !k.archived);
  const totalCount = activeKeys.length;
  const validCount = activeKeys.filter((k) => k.status === 'valid').length;
  const invalidCount = activeKeys.filter((k) => k.status === 'invalid').length;
  const archivedCount = keys.filter((k) => k.archived).length;

  // Filter keys
  const filteredKeys = keys.filter((k) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      k.label.toLowerCase().includes(term) ||
      k.key.toLowerCase().includes(term) ||
      (k.tags || []).some((t) => t.toLowerCase().includes(term));

    // The "archived" filter is a separate view; every other filter hides archived keys.
    const matchesStatus =
      statusFilter === 'archived'
        ? !!k.archived
        : !k.archived &&
          (statusFilter === 'all' ||
            (statusFilter === 'valid' && k.status === 'valid') ||
            (statusFilter === 'invalid' && k.status === 'invalid') ||
            (statusFilter === 'untested' && k.status === 'untested'));

    const matchesProvider = providerFilter === 'all' || (k.provider ?? 'gemini') === providerFilter;

    return matchesSearch && matchesStatus && matchesProvider;
  });

  const handleSelectKey = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(filteredKeys.map((k) => k.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkCheck = () => {
    if (selectedIds.length === 0) return;
    onCheckBulk(selectedIds);
    // Keep selection
  };

  const handleBulkArchive = () => {
    if (selectedIds.length === 0) return;
    // Toggle to the opposite of the current view: archive active keys, restore archived ones.
    onArchiveBulk(selectedIds, !viewingArchived);
    setSelectedIds([]);
  };

  return (
    <div>
      {/* Metric Cards */}
      <div className="stats-grid">
        <div className="panel stat-card">
          <div className="stat-label">Total Keys</div>
          <div className="stat-value">{totalCount}</div>
        </div>

        <div className="panel stat-card">
          <div className="stat-label">Valid</div>
          <div className="stat-value" style={{ color: 'var(--secondary)' }}>{validCount}</div>
        </div>

        <div className="panel stat-card">
          <div className="stat-label">Invalid</div>
          <div className="stat-value" style={{ color: 'var(--dnd)' }}>{invalidCount}</div>
        </div>

        <div className="panel stat-card">
          <div className="stat-label">Archived</div>
          <div className="stat-value" style={{ color: 'var(--ink-muted)' }}>{archivedCount}</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>

          {/* Left search/filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flexGrow: 1, maxWidth: '600px' }}>
            <input
              type="text"
              className="input-text"
              style={{ flexGrow: 1, minWidth: '220px', width: 'auto' }}
              placeholder="Search by name, tag, or characters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="select-input"
              style={{ width: '170px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="valid">Valid</option>
              <option value="invalid">Invalid</option>
              <option value="untested">Untested</option>
              <option value="archived">Archived</option>
            </select>

            <select
              className="select-input"
              style={{ width: '150px' }}
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value as any)}
            >
              <option value="all">All Providers</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleBulkCheck}
                  title="Check selected keys"
                >
                  Check ({selectedIds.length})
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleBulkArchive}
                  title={viewingArchived ? 'Restore selected keys' : 'Archive selected keys'}
                >
                  {viewingArchived ? 'Restore' : 'Archive'}
                </button>
              </div>
            )}

            <button
              className="btn btn-secondary"
              onClick={onClassifyDuplicates}
              title="Find and classify keys with repeated values"
            >
              Check duplicates
            </button>

            <button className="btn btn-primary" onClick={onAddKeyClick}>
              Add Key
            </button>
          </div>

        </div>
      </div>

      {/* Main Table view */}
      <KeyTable
        keys={filteredKeys}
        onCheck={onCheckKey}
        onEdit={onEditKey}
        onArchive={onArchiveKey}
        onDelete={onDeleteKey}
        onOpenTester={onOpenTester}
        onSetTier={onSetTier}
        onSetProvider={onSetProvider}
        onUpdateTags={onUpdateTags}
        selectedIds={selectedIds}
        onSelectKey={handleSelectKey}
        onSelectAll={handleSelectAll}
        checkingIds={checkingIds}
      />
    </div>
  );
}
