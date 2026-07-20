import { useState } from 'react';
import { ApiKeyData } from '../services/gemini';
import { Tier, representativeLimit, usageForToday, fmtNum } from '../services/quota';
import { Provider, PROVIDERS, PROVIDER_LABELS } from '../services/providers';

interface KeyDetailModalProps {
  keyData: ApiKeyData | null;
  onClose: () => void;
  onSetTier: (id: string, tier: Tier) => void;
  onSetProvider: (id: string, provider: Provider) => void;
  onOpenTester: (key: ApiKeyData) => void;
  onEdit: (key: ApiKeyData) => void;
}

export default function KeyDetailModal({ keyData, onClose, onSetTier, onSetProvider, onOpenTester, onEdit }: KeyDetailModalProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!keyData) return null;
  const k = keyData;

  const provider: Provider = k.provider ?? 'gemini';
  const tier: Tier = k.tier ?? 'unknown';
  const usage = usageForToday(k.usage);
  const limit = representativeLimit(tier, k.models);
  const rpdPct =
    limit && limit.rpd ? Math.min(100, Math.round((usage.requests / limit.rpd) * 100)) : null;

  const copy = () => {
    navigator.clipboard.writeText(k.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const labelStyle = { fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '4px', fontWeight: 600 } as const;
  const sectionStyle = { marginBottom: '20px' } as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{k.label}</h2>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Fechar</button>
        </div>

        <div className="modal-body">
          {/* Provider */}
          <div style={sectionStyle}>
            <div className="flex-between" style={{ marginBottom: '4px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ ...labelStyle, marginBottom: 0 }}>Provider</div>
              <select
                className="select-input"
                style={{ width: 'auto', height: '30px', padding: '0 8px', fontSize: '12px' }}
                value={provider}
                onChange={(e) => onSetProvider(k.id, e.target.value as Provider)}
                title="Changing the provider resets the check status"
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <span className={`badge badge-provider-${provider}`}>{PROVIDER_LABELS[provider]}</span>
          </div>

          {/* Status */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Status</div>
            {k.status === 'valid' && (
              <span className="badge badge-valid"><span className="status-dot status-dot-active"></span>Válida</span>
            )}
            {k.status === 'invalid' && (
              <span className="badge badge-invalid"><span className="status-dot status-dot-inactive"></span>Inválida</span>
            )}
            {k.status === 'untested' && (
              <span className="badge badge-untested"><span className="status-dot status-dot-untested"></span>Não Testada</span>
            )}
            {k.errorDetails && (
              <div style={{ fontSize: '13px', color: 'var(--dnd)', marginTop: '8px', lineHeight: 1.4 }}>{k.errorDetails}</div>
            )}
          </div>

          {/* Tags */}
          {k.tags && k.tags.length > 0 && (
            <div style={sectionStyle}>
              <div style={labelStyle}>Tags / Classificação</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {k.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px',
                    background: tag.toLowerCase().includes('limit') ? 'var(--error-bg)' : 'var(--surface-2)',
                    color: tag.toLowerCase().includes('limit') ? 'var(--dnd)' : 'var(--ink-muted)',
                    border: `1px solid ${tag.toLowerCase().includes('limit') ? 'var(--error-border)' : 'var(--surface-3)'}`
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Key */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Chave API</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <code style={{
                fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--ink)',
                background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                wordBreak: 'break-all', flex: 1, minWidth: '200px'
              }}>
                {revealed ? k.key : `${k.key.substring(0, 6)}${'•'.repeat(Math.max(0, Math.min(20, k.key.length - 10)))}${k.key.substring(k.key.length - 4)}`}
              </code>
              <button className="btn btn-ghost btn-xs" onClick={() => setRevealed((v) => !v)}>
                {revealed ? 'Ocultar' : 'Mostrar'}
              </button>
              <button className="btn btn-ghost btn-xs" onClick={copy} style={copied ? { color: 'var(--secondary)' } : undefined}>
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Models */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Modelos Disponíveis ({k.models.length})</div>
            {k.models.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {k.models.map((m) => (
                  <span key={m} style={{
                    fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink)',
                    background: 'var(--surface-2)', padding: '3px 8px', borderRadius: '999px'
                  }}>{m}</span>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Nenhum — verifique a chave primeiro.</span>
            )}
          </div>

          {/* Quota estimate */}
          <div style={sectionStyle}>
            <div className="flex-between" style={{ marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ ...labelStyle, marginBottom: 0 }}>Estimativa de Quota (hoje)</div>
              <select
                className="select-input"
                style={{ width: 'auto', height: '30px', padding: '0 8px', fontSize: '12px' }}
                value={tier}
                onChange={(e) => onSetTier(k.id, e.target.value as Tier)}
                title="Plano de faturamento desta chave"
              >
                <option value="unknown">Plano: Desconhecido</option>
                <option value="free">Plano: Gratuito</option>
                <option value="paid">Plano: Pago</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Req. hoje (via app)</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>{usage.requests}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Tokens hoje (via app)</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>{fmtNum(usage.totalTokens)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Limite RPM · TPM</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                  {limit ? `${fmtNum(limit.rpm)} · ${fmtNum(limit.tpm)}` : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Limite diário (RPD)</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>{limit ? fmtNum(limit.rpd) : '—'}</div>
              </div>
            </div>
            {rpdPct !== null && (
              <div style={{ marginTop: '10px' }}>
                <div className="flex-between" style={{ fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                  <span>Consumo diário estimado (só deste app)</span>
                  <span>{usage.requests} / {limit!.rpd} req · {rpdPct}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${rpdPct}%`, height: '100%',
                    background: rpdPct >= 90 ? 'var(--dnd)' : rpdPct >= 60 ? 'var(--idle)' : 'var(--secondary)'
                  }} />
                </div>
              </div>
            )}
            <p style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '10px', lineHeight: 1.5 }}>
              Estimativa: conta apenas o uso feito por este app hoje. O consumo real não é exposto pela API do Gemini.
            </p>
          </div>

          {/* Notes + meta */}
          {k.notes && (
            <div style={sectionStyle}>
              <div style={labelStyle}>Notas</div>
              <div style={{ fontSize: '13px', color: 'var(--ink)' }}>{k.notes}</div>
            </div>
          )}
          <div style={sectionStyle}>
            <div style={labelStyle}>Última Verificação</div>
            <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
              {k.lastChecked ? new Date(k.lastChecked).toLocaleString('pt-BR') : 'Nunca'}
            </div>
          </div>
          <div style={sectionStyle}>
            <div style={labelStyle}>Adicionada em</div>
            <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
              {k.addedAt ? new Date(k.addedAt).toLocaleString('pt-BR') : 'Desconhecido'}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '16px 0 0 0', background: 'transparent' }}>
          <button className="btn btn-secondary" onClick={() => onEdit(k)}>Editar</button>
          <button
            className="btn btn-primary"
            onClick={() => onOpenTester(k)}
            disabled={k.status !== 'valid' || provider !== 'gemini'}
            title={provider !== 'gemini' ? 'Test console currently only supports Gemini keys' : undefined}
          >
            Testar no Console
          </button>
        </div>
      </div>
    </div>
  );
}
