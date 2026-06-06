/* eslint-disable */
window.KpiTile = function KpiTile({ label, value, delta, deltaKind = 'pos', sub }) {
  const deltaColor = { pos: '#2E7D5B', neg: '#B23C3C', warn: '#C98A1F' }[deltaKind];
  const arrow = { pos: '▲', neg: '▼', warn: '●' }[deltaKind];
  return (
    <div style={{
      background: '#fff', border: '1px solid #DEE2E8', borderRadius: 4,
      padding: 18,
    }}>
      <div style={{
        fontFamily: "'Inter'", fontWeight: 500, fontSize: 11,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B7585',
      }}>{label}</div>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700, fontSize: 32, lineHeight: 1.1,
        letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
        color: '#0E2543', marginTop: 8,
      }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <span style={{
          fontFamily: "'Inter'", fontWeight: 600, fontSize: 12, color: deltaColor,
        }}>{arrow} {delta}</span>
        {sub && <span style={{
          fontFamily: "'Inter'", fontSize: 12, color: '#6B7585',
        }}>{sub}</span>}
      </div>
    </div>
  );
};
