/* eslint-disable */
const { useState } = React;

window.FilterBar = function FilterBar() {
  const [period, setPeriod] = useState('YTD');
  const [region, setRegion] = useState('Todas');
  const periods = ['Hoy', 'Mes', 'Trim.', 'YTD', '12M'];
  const regions = ['Todas', 'AMBA', 'Centro', 'NOA', 'Patagonia'];

  const seg = (active) => ({
    fontFamily: "'Inter'", fontWeight: 500, fontSize: 12,
    padding: '6px 14px', cursor: 'pointer',
    background: active ? '#0E2543' : 'transparent',
    color: active ? '#F7F6F2' : '#2D3540',
    border: 'none', transition: 'all 140ms',
  });

  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #DEE2E8',
      padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: "'Inter'", fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#6B7585',
        }}>Período</span>
        <div style={{ display: 'flex', border: '1px solid #DEE2E8', borderRadius: 4, overflow: 'hidden' }}>
          {periods.map(p => (
            <button key={p} style={seg(period === p)} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: "'Inter'", fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#6B7585',
        }}>Región</span>
        <div style={{ display: 'flex', border: '1px solid #DEE2E8', borderRadius: 4, overflow: 'hidden' }}>
          {regions.map(r => (
            <button key={r} style={seg(region === r)} onClick={() => setRegion(r)}>{r}</button>
          ))}
        </div>
      </div>
      <button style={{
        marginLeft: 'auto',
        fontFamily: "'Inter'", fontSize: 12, fontWeight: 500,
        background: 'transparent', color: '#0E2543',
        border: '1px solid #0E2543', borderRadius: 4,
        padding: '6px 14px', cursor: 'pointer',
      }}>Exportar ▾</button>
    </div>
  );
};
