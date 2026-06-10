/* eslint-disable */
const SERIES = [40, 44, 42, 50, 58, 64, 62, 71, 75, 78, 82, 90];

window.LineChart = function LineChart() {
  const W = 520, H = 220, pad = 28;
  const max = 100;
  const pts = SERIES.map((v, i) => {
    const x = pad + (i / (SERIES.length - 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const area = `${path} L ${pts.at(-1)[0]} ${H - pad} L ${pts[0][0]} ${H - pad} Z`;

  return (
    <div style={{ background: '#fff', border: '1px solid #DEE2E8', borderRadius: 4, padding: 18 }}>
      <div style={{
        fontFamily: "'Inter'", fontWeight: 500, fontSize: 11,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B7585',
      }}>Margen Bruto Acumulado</div>
      <div style={{
        fontFamily: "'EB Garamond', serif", fontWeight: 500,
        fontSize: 22, color: '#0E2543', marginTop: 2, marginBottom: 12,
      }}>Tendencia 12 meses</div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8FB8D6" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#8FB8D6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={pad} x2={W-pad} y1={pad + (H-pad*2)*t} y2={pad + (H-pad*2)*t}
                stroke="#EEF1F4" strokeWidth="1"/>
        ))}
        <path d={area} fill="url(#lg)"/>
        <path d={path} fill="none" stroke="#0E2543" strokeWidth="2"/>
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke="#0E2543" strokeWidth="1.5"/>
        ))}
      </svg>
    </div>
  );
};
