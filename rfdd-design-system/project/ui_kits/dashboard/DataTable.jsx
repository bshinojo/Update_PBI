/* eslint-disable */
const ROWS = [
  { name: 'Bimbo Argentina', ventas: '$ 42,8 M', margen: '31,2 %', dso: 38, var: 14.2, kind: 'pos' },
  { name: 'Molinos Río',     ventas: '$ 38,4 M', margen: '27,8 %', dso: 44, var: 8.1,  kind: 'pos' },
  { name: 'Patagonia SA',    ventas: '$ 22,1 M', margen: '24,4 %', dso: 52, var: -2.4, kind: 'neg' },
  { name: 'Amcor',           ventas: '$ 18,9 M', margen: '29,1 %', dso: 41, var: 5.6,  kind: 'pos' },
  { name: 'Prosegur',        ventas: '$ 14,2 M', margen: '22,0 %', dso: 60, var: -6.8, kind: 'neg' },
  { name: 'Cotnyl',          ventas: '$ 11,4 M', margen: '26,5 %', dso: 47, var: 1.2,  kind: 'warn' },
];

window.DataTable = function DataTable() {
  return (
    <div style={{ background: '#fff', border: '1px solid #DEE2E8', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #DEE2E8' }}>
        <div style={{
          fontFamily: "'Inter'", fontWeight: 500, fontSize: 11,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B7585',
        }}>Top Cuentas</div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontWeight: 500,
          fontSize: 22, color: '#0E2543',
        }}>Performance por cliente · YTD</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter'", fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F7F6F2' }}>
            {['Cliente', 'Ventas', 'Margen', 'DSO', 'Var. vs presup.'].map((h, i) => (
              <th key={h} style={{
                padding: '10px 18px', textAlign: i === 0 ? 'left' : 'right',
                fontWeight: 500, fontSize: 11, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#6B7585',
                borderBottom: '1px solid #DEE2E8',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(r => {
            const c = { pos: '#2E7D5B', neg: '#B23C3C', warn: '#C98A1F' }[r.kind];
            const a = { pos: '▲', neg: '▼', warn: '●' }[r.kind];
            return (
              <tr key={r.name} style={{ borderBottom: '1px solid #EEF1F4' }}>
                <td style={{ padding: '12px 18px', color: '#0E2543', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '12px 18px', textAlign: 'right', color: '#2D3540', fontVariantNumeric: 'tabular-nums' }}>{r.ventas}</td>
                <td style={{ padding: '12px 18px', textAlign: 'right', color: '#2D3540', fontVariantNumeric: 'tabular-nums' }}>{r.margen}</td>
                <td style={{ padding: '12px 18px', textAlign: 'right', color: '#2D3540', fontVariantNumeric: 'tabular-nums' }}>{r.dso} d</td>
                <td style={{ padding: '12px 18px', textAlign: 'right', color: c, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {a} {r.var > 0 ? '+' : ''}{r.var}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
