/* eslint-disable */
window.DashHeader = function DashHeader({ title, subtitle }) {
  return (
    <header style={{
      background: '#fff', borderBottom: '1px solid #DEE2E8',
      padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 24,
    }}>
      <img src="../../assets/logo.png" alt="" style={{ height: 30 }}/>
      <div style={{ width: 1, height: 32, background: '#DEE2E8' }}></div>
      <div>
        <div style={{
          fontFamily: "'Inter'", fontWeight: 600, fontSize: 14, color: '#0E2543',
          lineHeight: 1.2,
        }}>{title}</div>
        <div style={{
          fontFamily: "'Inter'", fontSize: 11, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: '#6B7585', marginTop: 2,
        }}>{subtitle}</div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontFamily: "'Inter'", fontSize: 12, color: '#6B7585' }}>
          Última actualización · hace 4 min
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#0E2543', color: '#F7F6F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Inter'", fontWeight: 600, fontSize: 12,
        }}>JR</div>
      </div>
    </header>
  );
};
