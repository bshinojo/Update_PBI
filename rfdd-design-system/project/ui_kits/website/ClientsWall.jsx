/* eslint-disable */
const CLIENTS = [
  'BIMBO', 'PROSEGUR', 'PATAGONIA', 'AMCOR', 'MOLINOS',
  'ASPRO', 'ABIN', 'MOSQUI', 'COTNYL', 'MONTAGNE',
  'GRETA', 'PAOLINI', 'ARIZMENDI', 'NUTROVO', 'ELEMON',
  'JUÁREZ', 'DNTE', 'MOTOR',
];

window.ClientsWall = function ClientsWall() {
  return (
    <section style={{ background: '#F7F6F2', padding: '96px 0', borderTop: '1px solid #DEE2E8' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px' }}>
        <div style={{
          fontFamily: "'Inter'", fontWeight: 500, fontSize: 12,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: '#6B7585', marginBottom: 16,
        }}>Confían en nosotros</div>
        <h2 style={{
          fontFamily: "'EB Garamond', serif",
          fontWeight: 500, fontSize: 44, lineHeight: 1.1,
          color: '#0E2543', margin: '0 0 56px',
        }}>Nuestros Clientes</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          border: '1px solid #DEE2E8',
          background: '#fff',
        }}>
          {CLIENTS.map((c, i) => (
            <div key={c} style={{
              padding: '32px 16px',
              borderRight: (i + 1) % 6 === 0 ? 'none' : '1px solid #DEE2E8',
              borderBottom: i < 12 ? '1px solid #DEE2E8' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 88,
            }}>
              <span style={{
                fontFamily: "'EB Garamond', serif",
                fontWeight: 500, fontSize: 20, letterSpacing: '0.08em',
                color: '#4A5363',
              }}>{c}</span>
            </div>
          ))}
        </div>
        <div style={{
          fontFamily: "'Inter'", fontSize: 12, color: '#9099A7',
          marginTop: 16, fontStyle: 'italic',
        }}>Wordmark placeholders — replace with each brand's real lockup.</div>
      </div>
    </section>
  );
};
