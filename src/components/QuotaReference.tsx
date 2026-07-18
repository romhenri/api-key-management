export default function QuotaReference() {
  const cellStyle = { padding: '8px 12px' };
  const modelCellStyle = { ...cellStyle, fontWeight: 600 };
  const monoCellStyle = { ...cellStyle, fontFamily: 'var(--font-mono)' };

  return (
    <div className="panel">
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
        Limites de Quotas de Referência
      </h2>
      <p style={{ color: 'var(--ink-muted)', fontSize: '14px', marginBottom: '24px' }}>
        Os limites da API do Gemini são aplicados por projeto e baseados no plano (Gratuito vs. Pago) configurado no Google AI Studio.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{
          padding: '16px',
          background: 'var(--surface-2)',
          borderLeft: '4px solid var(--idle)',
          borderRadius: 'var(--radius-md)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
            Plano Gratuito (Free Tier)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
            Uso gratuito em troca de dados enviados serem utilizados para treinamento de modelos da Google.
          </p>
          <div className="table-container">
            <table style={{ minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={cellStyle}>Modelo</th>
                  <th style={cellStyle}>RPM</th>
                  <th style={cellStyle}>TPM</th>
                  <th style={cellStyle}>RPD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={modelCellStyle}>Gemini 1.5 Flash</td>
                  <td style={monoCellStyle}>15</td>
                  <td style={monoCellStyle}>1M</td>
                  <td style={monoCellStyle}>1.500</td>
                </tr>
                <tr>
                  <td style={modelCellStyle}>Gemini 1.5 Pro</td>
                  <td style={monoCellStyle}>2</td>
                  <td style={monoCellStyle}>32k</td>
                  <td style={monoCellStyle}>50</td>
                </tr>
                <tr>
                  <td style={modelCellStyle}>Gemini 1.0 Pro</td>
                  <td style={monoCellStyle}>15</td>
                  <td style={monoCellStyle}>32k</td>
                  <td style={monoCellStyle}>1.500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'var(--surface-2)',
          borderLeft: '4px solid var(--online)',
          borderRadius: 'var(--radius-md)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
            Plano Pago (Pay-As-You-Go)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
            Faturamento via GCP ativado. Dados de entrada e saída permanecem privados.
          </p>
          <div className="table-container">
            <table style={{ minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={cellStyle}>Modelo</th>
                  <th style={cellStyle}>RPM</th>
                  <th style={cellStyle}>TPM</th>
                  <th style={cellStyle}>RPD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={modelCellStyle}>Gemini 1.5 Flash</td>
                  <td style={monoCellStyle}>360</td>
                  <td style={monoCellStyle}>4M</td>
                  <td style={monoCellStyle}>Ilimitado</td>
                </tr>
                <tr>
                  <td style={modelCellStyle}>Gemini 1.5 Pro</td>
                  <td style={monoCellStyle}>360</td>
                  <td style={monoCellStyle}>4M</td>
                  <td style={monoCellStyle}>Ilimitado</td>
                </tr>
                <tr>
                  <td style={modelCellStyle}>Gemini 1.0 Pro</td>
                  <td style={monoCellStyle}>360</td>
                  <td style={monoCellStyle}>120k</td>
                  <td style={monoCellStyle}>Ilimitado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--ink-muted)', lineHeight: '1.5' }}>
        <strong style={{ color: 'var(--ink)' }}>Legendas:</strong><br />
        <strong>RPM:</strong> Requisições Por Minuto (Requests Per Minute)<br />
        <strong>TPM:</strong> Tokens Por Minuto (Tokens Per Minute)<br />
        <strong>RPD:</strong> Requisições Por Dia (Requests Per Day)
      </div>
    </div>
  );
}
