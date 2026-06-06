/* eslint-disable */
const MONTHS = ['E','F','M','A','M','J','J','A','S','O','N','D'];
const ACTUAL = [12.4, 14.1, 13.8, 16.2, 18.0, 17.1, 19.4, 20.2, 19.8, 21.6, 22.4, 24.1];
const BUDGET = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

window.BarChart = function BarChart() {
  const max = Math.max(...ACTUAL, ...BUDGET);
  const W = 520, H = 220, pad = 28, bw = (W - pad * 2) / MONTHS.length;
  return (
    <div style={{ background: '#fff', border: '1px solid #DEE2E8', borderRadius: 4, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <div style={{
            fontFamily: "'Inter'", fontWeight: 500, fontSize: 11,
            letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B7585',
          }}>Ventas Mensuales</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 500,
            fontSize: 22, color: '#0E2543', marginTop: 2,
          }}>Real vs. Presupuesto · 2024</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontFamily: "'Inter'", fontSize: 11, color: '#4A5363' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#0E2543', marginRight: 6, verticalAlign: 'middle' }}/>Real</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#8FB8D6', marginRight: 6, verticalAlign: 'middle' }}/>Presupuesto</span>
        </div>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.5, 1].map(t => (
          <line key={t} x1={pad} x2={W-pad} y1={pad + (H-pad*2)*t} y2={pad + (H-pad*2)*t}
                stroke="#EEF1F4" strokeWidth="1" />
        ))}
        {MONTHS.map((m, i) => {
          const ax = pad + i * bw + 4;
          const bx = ax + (bw - 8) / 2;
          const ah = ((H - pad*2) * ACTUAL[i]) / max;
          const bh = ((H - pad*2) * BUDGET[i]) / max;
          return (
            <g key={i}>
              <rect x={ax} y={H - pad - ah} width={(bw-8)/2 - 1} height={ah} fill="#0E2543"/>
              <rect x={bx} y={H - pad - bh} width={(bw-8)/2 - 1} height={bh} fill="#8FB8D6"/>
              <text x={ax + (bw-8)/2 - 1} y={H - 8} textAnchor="middle"
                    fontFamily="'Inter'" fontSize="10" fill="#6B7585">{m}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
