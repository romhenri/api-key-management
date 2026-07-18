import React, { useState, useEffect } from 'react';
import { ApiKeyData, testGeminiGeneration } from '../services/gemini';
import { Tier, limitForModel, usageForToday, fmtNum } from '../services/quota';

interface TesterConsoleProps {
  keys: ApiKeyData[];
  preselectedKeyId?: string;
  onRecordUsage: (id: string, tokens: number) => void;
  onSetTier: (id: string, tier: Tier) => void;
}

export default function TesterConsole({ keys, preselectedKeyId, onRecordUsage, onSetTier }: TesterConsoleProps) {
  const validKeys = keys.filter((k) => k.status === 'valid');

  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('Diga olá em uma frase poética sobre o universo.');
  const [temperature, setTemperature] = useState(0.7);

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ time: string; text: string; type: 'info' | 'success' | 'error' | 'warn' }[]>([]);
  const [result, setResult] = useState<{
    text: string;
    latencyMs: number;
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync selected key from props or list
  useEffect(() => {
    if (preselectedKeyId && validKeys.some((k) => k.id === preselectedKeyId)) {
      setSelectedKeyId(preselectedKeyId);
    } else if (validKeys.length > 0 && !selectedKeyId) {
      setSelectedKeyId(validKeys[0].id);
    }
  }, [preselectedKeyId, validKeys, selectedKeyId]);

  // Sync selected model when key changes
  const currentKey = validKeys.find((k) => k.id === selectedKeyId);
  useEffect(() => {
    if (currentKey && currentKey.models.length > 0) {
      // Find a standard model to select as default, e.g. gemini-1.5-flash
      const flashModel = currentKey.models.find((m) => m.includes('1.5-flash') || m.includes('flash'));
      setSelectedModel(flashModel || currentKey.models[0]);
    } else {
      setSelectedModel('');
    }
  }, [selectedKeyId, currentKey]);

  const addLog = (text: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [...prev, { time, text, type }]);
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeyId || !selectedModel || !prompt.trim()) return;

    const keyObj = validKeys.find((k) => k.id === selectedKeyId);
    if (!keyObj) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);

    addLog(`Iniciando teste de geração de conteúdo...`, 'info');
    addLog(`Modelo: ${selectedModel}`, 'info');
    addLog(`Chave Utilizada: ${keyObj.label} (${keyObj.key.substring(0, 6)}...${keyObj.key.substring(keyObj.key.length - 4)})`, 'info');
    addLog(`Enviando prompt: "${prompt}"`, 'info');

    const res = await testGeminiGeneration(keyObj.key, selectedModel, prompt, temperature);

    if (res.success) {
      addLog(`Requisição concluída com sucesso!`, 'success');
      addLog(`Latência de rede/geração: ${res.latencyMs}ms`, 'success');
      if (res.totalTokens !== undefined) {
        addLog(`Tokens utilizados: ${res.promptTokens} (entrada) + ${res.candidatesTokens} (saída) = ${res.totalTokens} total.`, 'success');
      }
      // Count this request + its tokens against the key's local usage estimate.
      onRecordUsage(keyObj.id, res.totalTokens ?? 0);
      addLog(`Uso local registrado para "${keyObj.label}".`, 'info');
      setResult({
        text: res.text,
        latencyMs: res.latencyMs,
        promptTokens: res.promptTokens,
        candidatesTokens: res.candidatesTokens,
        totalTokens: res.totalTokens
      });
    } else {
      addLog(`Falha na requisição: ${res.error}`, 'error');
      if (res.rateLimited) {
        addLog(`Limite de quota atingido (429) — a chave é válida, mas sem saldo agora.`, 'warn');
        if (!keyObj.tier || keyObj.tier === 'unknown') {
          onSetTier(keyObj.id, 'free');
          addLog(`Tier inferido como "Gratuito" a partir do limite atingido.`, 'info');
        }
      }
      setError(res.error || 'Erro inesperado.');
    }
    setLoading(false);
  };

  const copyResult = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLatencyRating = (ms: number) => {
    if (ms < 1500) return { label: 'Rápido', color: 'var(--secondary)' };
    if (ms < 3500) return { label: 'Médio', color: 'var(--idle)' };
    return { label: 'Lento', color: 'var(--dnd)' };
  };

  return (
    <div className="dashboard-grid">
      <div className="panel">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '24px' }}>
          Console de Testes Interativos
        </h2>

        {validKeys.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink)' }}>
            <p>Nenhuma chave válida disponível para testes.</p>
            <p style={{ fontSize: '14px', color: 'var(--ink-muted)', marginTop: '8px' }}>
              Adicione e verifique uma chave API válida primeiro na aba do Painel.
            </p>
          </div>
        ) : (
          <form onSubmit={handleTest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="select-key">Selecionar Chave Válida</label>
                <select
                  id="select-key"
                  className="select-input"
                  value={selectedKeyId}
                  onChange={(e) => setSelectedKeyId(e.target.value)}
                >
                  {validKeys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label} ({k.key.substring(0, 6)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="select-model">Modelo de Teste</label>
                <select
                  id="select-model"
                  className="select-input"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!currentKey || currentKey.models.length === 0}
                >
                  {currentKey?.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  )) || <option value="">Sem modelos disponíveis</option>}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px', alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="prompt-input">Prompt / Instrução</label>
                <input
                  id="prompt-input"
                  className="input-text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Envie uma pergunta ou prompt para testar..."
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="temp-input">Temp: {temperature}</label>
                <input
                  id="temp-input"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  className="select-input"
                  style={{ height: '38px', padding: '0 8px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedModel}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processando...
                </>
              ) : (
                'Executar Teste de Requisição'
              )}
            </button>
          </form>
        )}

        {/* Quota estimate for the selected key + model */}
        {currentKey && (() => {
          const tier: Tier = currentKey.tier ?? 'unknown';
          const usage = usageForToday(currentKey.usage);
          const limit = selectedModel ? limitForModel(tier, selectedModel) : null;
          const rpdPct =
            limit && limit.rpd ? Math.min(100, Math.round((usage.requests / limit.rpd) * 100)) : null;

          return (
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex-between" style={{ marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Estimativa de Quota</h3>
                <div className="form-group" style={{ margin: 0 }}>
                  <select
                    className="select-input"
                    style={{ width: 'auto', height: '32px', padding: '0 8px', fontSize: '13px' }}
                    value={tier}
                    onChange={(e) => onSetTier(currentKey.id, e.target.value as Tier)}
                    title="Plano de faturamento desta chave"
                  >
                    <option value="unknown">Plano: Desconhecido</option>
                    <option value="free">Plano: Gratuito</option>
                    <option value="paid">Plano: Pago</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Req. hoje (via app)</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{usage.requests}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tokens hoje (via app)</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{fmtNum(usage.totalTokens)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Limite RPM · TPM</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                    {limit ? `${fmtNum(limit.rpm)} · ${fmtNum(limit.tpm)}` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Limite diário (RPD)</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{limit ? fmtNum(limit.rpd) : '—'}</div>
                </div>
              </div>

              {rpdPct !== null && (
                <div style={{ marginTop: '12px' }}>
                  <div className="flex-between" style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    <span>Consumo diário estimado (só deste app)</span>
                    <span>{usage.requests} / {limit!.rpd} req · {rpdPct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${rpdPct}%`,
                      height: '100%',
                      background: rpdPct >= 90 ? 'var(--dnd)' : rpdPct >= 60 ? 'var(--idle)' : 'var(--secondary)',
                      transition: 'width var(--duration-base) var(--easing)'
                    }} />
                  </div>
                </div>
              )}

              <p style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '12px', lineHeight: 1.5 }}>
                {tier === 'unknown'
                  ? 'Selecione o plano da chave para ver os limites. '
                  : ''}
                Estimativa: conta apenas o uso feito por este app hoje. O consumo real (incluindo outras origens) não é exposto pela API do Gemini.
              </p>
            </div>
          );
        })()}

        {/* Results Panel */}
        {result && (
          <div style={{ marginTop: '32px' }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Resposta do Modelo</h3>
              <button
                className="btn btn-secondary btn-xs"
                onClick={copyResult}
                style={copied ? { color: 'var(--secondary)' } : undefined}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div style={{
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              maxHeight: '300px',
              overflowY: 'auto',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              borderLeft: '4px solid var(--primary)'
            }}>
              {result.text}
            </div>

            {/* Performance Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Latência</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                  {result.latencyMs} ms
                </div>
                <div style={{ fontSize: '11px', color: getLatencyRating(result.latencyMs).color, fontWeight: 600 }}>
                  {getLatencyRating(result.latencyMs).label}
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tokens Entrada</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                  {result.promptTokens ?? '-'}
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tokens Saída</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                  {result.candidatesTokens ?? '-'}
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Total Tokens</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                  {result.totalTokens ?? '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'var(--error-bg)',
            border: '1px solid var(--error-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--dnd)',
            fontSize: '14px'
          }}>
            <strong>Erro no processamento:</strong>
            <div style={{ marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{error}</div>
          </div>
        )}
      </div>

      {/* Logger Box */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
          Log de Rede & Diagnóstico
        </h2>

        <div className="console-logs" style={{ flexGrow: 1, height: '100%', minHeight: '260px' }}>
          {logs.length === 0 ? (
            <div style={{ color: 'var(--ink-muted)', fontSize: '13px', fontStyle: 'italic', padding: '16px 0' }}>
              Aguardando execução de testes para exibir logs de rede...
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="console-log-entry">
                <span className="console-log-time">[{log.time}]</span>
                <span className={`console-log-text console-log-${log.type}`}>
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--ink-muted)' }}>
          As requisições são feitas em tempo real diretamente do seu navegador para a API do Google Gemini.
        </div>
      </div>
    </div>
  );
}
