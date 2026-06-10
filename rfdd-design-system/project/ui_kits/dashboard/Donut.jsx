/* eslint-disable */
const SLICES = [
  { label: 'Productos A', value: 42, color: '#0E2543' },
  { label: 'Productos B', value: 28, color: '#2A4F86' },
  { label: 'Productos C', value: 18, color: '#8FB8D6' },
  { label: 'Otros',       value: 12, color: '#C9A24E' },
];

window.Donut = function Donut() {
  const total = SLICES.reduce((s, x) => s + x.value, 0);
  const R = 70, r = 44, cx = 90, cy = 90;
  let acc = -Math.PI / 2;
  return (
    <div style={{ background: '#fff', border: '1px solid #DEE2E8', borderRadius: 4, padding: 18, display: 'flex', gap: 20, alignItems: 'center' }}>
      <div>
        <div style={{
          fontFamily: "'Inter'", fontWeight: 500, fontSize: 11,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B7585',
          marginBottom: 12,
        }}>Mix de Ventas</div>
        <svg width="180" height="180">
          {SLICES.map((s, i) => {
            const a = (s.value / total) * Math.PI * 2;
            const x1 = cx + R * Math.cos(acc), y1 = cy + R * Math.sin(acc);
            const x2 = cx + R * Math.cos(acc + a), y2 = cy + R * Math.sin(acc + a);
            const x3 = cx + r * Math.cos(acc + a), y3 = cy + r * Math.sin(acc + a);
            const x4 = cx + r * Math.cos(acc), y4 = cy + r * Math.sin(acc);
            const large = a > Math.PI ? 1 : 0;
            const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
            acc += a;
            return <path key={i} d={d} fill={s.color}/>;
          })}
          <text x={cx} y={cy - 4} textAnchor="middle"
                fontFamily="'EB Garamond', serif" fontWeight="500" fontSize="22" fill="#0E2543">$184M</text>
          <text x={cx} y={cy + 14} textAnchor="middle"
                fontFamily="'Inter'" fontSize="10" letterSpacing="0.14em" fill="#6B7585">YTD</text>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        {SLICES.map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0', borderBottom: '1px solid #EEF1F4',
            fontFamily: "'Inter'", fontSize: 13,
          }}>
            <span style={{ width: 10, height: 10, background: s.color, flexShrink: 0 }}/>
            <span style={{ color: '#2D3540' }}>{s.label}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#0E2543' }}>{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
