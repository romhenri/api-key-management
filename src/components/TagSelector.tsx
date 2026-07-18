import { useState } from 'react';

// Suggested classifications. "Rate Limited" flags a key that hit quota limits.
export const SUGGESTED_TAGS = ['Rate Limited', 'Main', 'Sandbox', 'Backup', 'Production', 'Test'];

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export default function TagSelector({ value, onChange }: TagSelectorProps) {
  const [input, setInput] = useState('');

  const toggle = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const addCustom = () => {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  };

  // Show suggestions plus any custom tags already selected.
  const options = Array.from(new Set([...SUGGESTED_TAGS, ...value]));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {options.map((tag) => {
          const active = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '999px',
                cursor: 'pointer',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--surface-3)'}`,
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#ffffff' : 'var(--ink-muted)',
                transition: 'all var(--duration-fast) var(--easing)'
              }}
            >
              {active ? '✓ ' : ''}{tag}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        className="input-text"
        placeholder="Add a custom tag and press Enter..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addCustom();
          }
        }}
      />
    </div>
  );
}
