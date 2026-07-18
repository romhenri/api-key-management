import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ApiKeyData, validateGeminiKey } from './services/gemini';
import { Tier, bumpUsage } from './services/quota';
import Dashboard from './components/Dashboard';
import TesterConsole from './components/TesterConsole';
import QuotaReference from './components/QuotaReference';
import KeyModal from './components/KeyModal';

type TabId = 'dashboard' | 'tester' | 'reference';

const TAB_META: Record<TabId, { title: string; description: string }> = {
  dashboard: { title: 'Key Dashboard', description: 'Manage, validate, and classify your API keys' },
  tester: { title: 'Test Console', description: 'Send real prompts and measure latency and tokens' },
  reference: { title: 'Quota Reference', description: 'Limits per Google AI Studio plan' }
};

export default function App() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [preselectedKeyId, setPreselectedKeyId] = useState<string | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyData | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [checkingIds, setCheckingIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gemini_keys_consultant');
      if (stored) {
        setKeys(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load keys from localStorage:', e);
    }
  }, []);

  // Helper to save keys
  const saveKeys = (newKeys: ApiKeyData[]) => {
    setKeys(newKeys);
    try {
      localStorage.setItem('gemini_keys_consultant', JSON.stringify(newKeys));
    } catch (e) {
      console.error('Failed to save keys to localStorage:', e);
    }
  };

  // Add or update keys
  const handleSaveKeys = (savedList: { key: string; label: string; notes?: string; tier?: Tier; tags?: string[] }[]) => {
    if (editingKey) {
      // Edit mode — block renaming a key onto another existing key.
      const dup = keys.find((k) => k.id !== editingKey.id && k.key === savedList[0].key);
      if (dup) {
        alert(`This key already exists in the app under the label "${dup.label}". Change canceled.`);
        return;
      }
      const updated = keys.map((k) => {
        if (k.id === editingKey.id) {
          const hasChanged = k.key !== savedList[0].key;
          return {
            ...k,
            key: savedList[0].key,
            label: savedList[0].label,
            notes: savedList[0].notes,
            tier: savedList[0].tier ?? k.tier ?? 'unknown',
            tags: savedList[0].tags ?? k.tags ?? [],
            // Reset verification status if the key string was updated
            status: hasChanged ? ('untested' as const) : k.status,
            models: hasChanged ? [] : k.models,
            errorDetails: hasChanged ? undefined : k.errorDetails
          };
        }
        return k;
      });
      saveKeys(updated);
      setEditingKey(null);
    } else {
      // Add or Bulk import mode — skip keys already stored and duplicates within the batch.
      const existing = new Set(keys.map((k) => k.key));
      const seen = new Set<string>();
      let skipped = 0;

      const newEntries = savedList
        .filter((item) => {
          if (existing.has(item.key) || seen.has(item.key)) {
            skipped++;
            return false;
          }
          seen.add(item.key);
          return true;
        })
        .map((item) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
          key: item.key,
          label: item.label,
          status: 'untested' as const,
          models: [],
          notes: item.notes,
          tier: item.tier ?? ('unknown' as Tier),
          tags: item.tags ?? []
        }));

      if (newEntries.length > 0) {
        saveKeys([...keys, ...newEntries]);
      }

      if (skipped > 0) {
        const added = newEntries.length;
        alert(
          `${skipped} duplicate key(s) skipped.` +
            (added > 0 ? ` ${added} new key(s) added.` : ' No new keys to add.')
        );
      }
    }
  };

  // Set a key's billing tier (drives quota estimates).
  const handleSetTier = (id: string, tier: Tier) => {
    saveKeys(keys.map((k) => (k.id === id ? { ...k, tier } : k)));
  };

  // Replace a key's tags (inline editing from the table).
  const handleUpdateTags = (id: string, tags: string[]) => {
    saveKeys(keys.map((k) => (k.id === id ? { ...k, tags } : k)));
  };

  // Scan for keys whose value appears more than once. The FIRST occurrence of
  // each value is kept as the "original"; the extras get the "Duplicate" tag.
  const handleClassifyDuplicates = () => {
    const counts = new Map<string, number>();
    keys.forEach((k) => counts.set(k.key, (counts.get(k.key) || 0) + 1));

    const groupsWithDup = Array.from(counts.values()).filter((c) => c > 1).length;
    if (groupsWithDup === 0) {
      alert('No duplicate keys found.');
      return;
    }

    let tagged = 0;
    const seen = new Set<string>();
    const updated = keys.map((k) => {
      const isRepeated = (counts.get(k.key) || 0) > 1;
      const isFirst = !seen.has(k.key);
      seen.add(k.key);

      // Skip the first occurrence — only the extras are the duplicates.
      if (isRepeated && !isFirst && !(k.tags || []).includes('Duplicate')) {
        tagged++;
        return { ...k, tags: [...(k.tags || []), 'Duplicate'] };
      }
      return k;
    });

    saveKeys(updated);
    alert(
      `${groupsWithDup} repeated value(s) found. ` +
        `${tagged} extra key(s) classified with the "Duplicate" tag (the original was kept untagged).`
    );
  };

  // Record local usage (a request + its token cost) against a key.
  const handleRecordUsage = (id: string, tokens: number) => {
    setKeys((prev) => {
      const updated = prev.map((k) =>
        k.id === id ? { ...k, usage: bumpUsage(k.usage, tokens) } : k
      );
      try {
        localStorage.setItem('gemini_keys_consultant', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save usage to localStorage:', e);
      }
      return updated;
    });
  };

  // Permanently delete a key (irreversible — asks for confirmation).
  const handleDeleteKey = (id: string) => {
    const target = keys.find((k) => k.id === id);
    if (!target) return;
    const ok = window.confirm(
      `Permanently delete the key "${target.label}"?\n\nThis action is irreversible and cannot be undone.`
    );
    if (!ok) return;
    saveKeys(keys.filter((k) => k.id !== id));
  };

  // Archive / classify key (only classified as archived, unlike delete)
  const handleArchiveKey = (id: string, archived: boolean) => {
    const updated = keys.map((k) => (k.id === id ? { ...k, archived } : k));
    saveKeys(updated);
  };

  // Bulk archive / restore
  const handleArchiveBulk = (ids: string[], archived: boolean) => {
    const updated = keys.map((k) => (ids.includes(k.id) ? { ...k, archived } : k));
    saveKeys(updated);
  };

  // Validate single key
  const handleCheckKey = async (id: string) => {
    const keyData = keys.find((k) => k.id === id);
    if (!keyData) return;

    setCheckingIds((prev) => [...prev, id]);

    const result = await validateGeminiKey(keyData.key);

    const updated = keys.map((k) => {
      if (k.id === id) {
        return {
          ...k,
          status: result.status,
          // A rate-limited check returns no model list — keep the ones we already had.
          models: result.rateLimited && result.models.length === 0 ? k.models : result.models,
          errorDetails: result.errorDetails,
          // Hitting a limit means the key is billed on the free tier (paid rarely
          // caps like this). Only infer when the user hasn't set a tier.
          tier: result.rateLimited && (!k.tier || k.tier === 'unknown') ? 'free' : k.tier,
          // Auto-classify a rate-limited key as "Rate Limited" (kept once set).
          tags: result.rateLimited && !(k.tags || []).includes('Rate Limited')
            ? [...(k.tags || []), 'Rate Limited']
            : k.tags,
          lastChecked: new Date().toISOString()
        };
      }
      return k;
    });

    saveKeys(updated);
    setCheckingIds((prev) => prev.filter((item) => item !== id));

    // Celebratory confetti if validated successfully (but not when quota is exhausted)
    if (result.status === 'valid' && !result.rateLimited) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#5865F2', '#57F287', '#FEE75C', '#ED4245', '#ffffff']
      });
    }
  };

  // Validate bulk
  const handleCheckBulk = async (ids: string[]) => {
    // Run checks in parallel
    await Promise.all(ids.map((id) => handleCheckKey(id)));
  };

  // Open edit modal
  const handleEditClick = (keyData: ApiKeyData) => {
    setEditingKey(keyData);
    setIsModalOpen(true);
  };

  // Open tester console with specific key loaded
  const handleOpenTester = (keyData: ApiKeyData) => {
    setPreselectedKeyId(keyData.id);
    setActiveTab('tester');
  };

  // Export keys as a local JSON file
  const handleExportKeys = () => {
    if (keys.length === 0) {
      alert('No keys available to export.');
      return;
    }

    // We clean up sensitive metadata, keeping only what is required
    const cleanExport = keys.map(({ key, label, notes, tags }) => ({
      key,
      label,
      notes,
      tags
    }));

    const dataStr = JSON.stringify(cleanExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `gemini_api_keys_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import keys from local JSON file
  const handleImportKeys = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (!Array.isArray(content)) {
          alert('Import error: The file must contain a JSON list of keys.');
          return;
        }

        const newKeys: ApiKeyData[] = [...keys];
        let importedCount = 0;

        content.forEach((item: any) => {
          if (item.key) {
            // Check if key already exists to avoid duplicates
            if (!newKeys.some((nk) => nk.key === item.key)) {
              newKeys.push({
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
                key: item.key,
                label: item.label || 'Imported Key',
                status: 'untested' as const,
                models: [],
                notes: item.notes || 'Imported from JSON backup',
                tags: Array.isArray(item.tags) ? item.tags : []
              });
              importedCount++;
            }
          }
        });

        saveKeys(newKeys);
        alert(`${importedCount} new keys imported successfully!`);
      } catch (err) {
        alert('Error decoding the import JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const meta = TAB_META[activeTab];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="flex-between" style={{ gap: '8px' }}>
            <h1>API Key Control</h1>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse menu"
              style={{ flexShrink: 0 }}
            >
              «
            </button>
          </div>
          <p>100% local and secure</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Tools</div>
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Key Dashboard
          </button>
          <button
            className={`nav-item ${activeTab === 'tester' ? 'active' : ''}`}
            onClick={() => {
              setPreselectedKeyId(undefined);
              setActiveTab('tester');
            }}
          >
            Test Console
          </button>
          <button
            className={`nav-item ${activeTab === 'reference' ? 'active' : ''}`}
            onClick={() => setActiveTab('reference')}
          >
            Quota Reference
          </button>

          <div className="nav-section-label">Backup</div>
          <button
            className="nav-item"
            onClick={() => fileInputRef.current?.click()}
            title="Import keys from a JSON file"
          >
            Import keys
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportKeys}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button
            className="nav-item"
            onClick={handleExportKeys}
            title="Export key backup to JSON"
          >
            Export backup
          </button>
        </nav>

        <div className="sidebar-footer">
          <strong>Privacy guaranteed</strong>
          No keys are ever sent to third-party servers. Communication happens directly
          and exclusively with Google.
        </div>
      </aside>

      <div className="content">
        <header className="content-header">
          {sidebarCollapsed && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand menu"
              style={{ flexShrink: 0 }}
            >
              ☰
            </button>
          )}
          <h2>{meta.title}</h2>
          <span className="content-header-divider" />
          <p>{meta.description}</p>
        </header>

        <main className="content-body">
          {activeTab === 'dashboard' && (
            <Dashboard
              keys={keys}
              onCheckKey={handleCheckKey}
              onCheckBulk={handleCheckBulk}
              onEditKey={handleEditClick}
              onArchiveKey={handleArchiveKey}
              onArchiveBulk={handleArchiveBulk}
              onDeleteKey={handleDeleteKey}
              onAddKeyClick={() => {
                setEditingKey(null);
                setIsModalOpen(true);
              }}
              onOpenTester={handleOpenTester}
              onSetTier={handleSetTier}
              onUpdateTags={handleUpdateTags}
              onClassifyDuplicates={handleClassifyDuplicates}
              checkingIds={checkingIds}
            />
          )}

          {activeTab === 'tester' && (
            <TesterConsole
              keys={keys}
              preselectedKeyId={preselectedKeyId}
              onRecordUsage={handleRecordUsage}
              onSetTier={handleSetTier}
            />
          )}

          {activeTab === 'reference' && (
            <QuotaReference />
          )}
        </main>
      </div>

      {/* Add / Edit Key Modal */}
      <KeyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingKey(null);
        }}
        onSave={handleSaveKeys}
        editingKey={editingKey}
      />
    </div>
  );
}
