/* eslint-disable */
const SERVICES = [
  {
    title: 'Fusiones y Adquisiciones',
    items: ['Compra - Venta de Compañías', 'Valuación de Empresas', 'Transacciones Destacadas'],
  },
  {
    title: 'Consultoría Estratégica',
    items: ['Control de Gestión', 'Presupuestos', 'Estrategia Corporativa', 'Evaluación de Proyectos de Inversión'],
  },
  {
    title: 'Tableros de Gestión',
    items: ['Tablero de Ventas', 'Tablero de Créditos y Cobranzas', 'Tablero de Inventario', 'Tablero de Producción', 'Tablero de Resultados', 'Otros Tableros'],
  },
];

window.ServicesGrid = function ServicesGrid() {
  return (
    <section style={{ background: '#fff', padding: '96px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px' }}>
        <div style={{
          fontFamily: "'Inter'", fontWeight: 500, fontSize: 12,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: '#6B7585', marginBottom: 16,
        }}>Servicios</div>
        <h2 style={{
          fontFamily: "'EB Garamond', serif",
          fontWeight: 500, fontSize: 52, lineHeight: 1.1,
          color: '#0E2543', margin: 0, maxWidth: 720,
        }}>¿Qué podemos hacer por tu empresa?</h2>
        <div style={{
          marginTop: 64,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32,
        }}>
          {SERVICES.map(s => (
            <div key={s.title} style={{
              background: '#F7F6F2',
              borderTop: '2px solid #0E2543',
              padding: '32px 28px',
              minHeight: 320,
              display: 'flex', flexDirection: 'column',
            }}>
              <h3 style={{
                fontFamily: "'EB Garamond', serif",
                fontWeight: 500, fontSize: 28, lineHeight: 1.2,
                color: '#0E2543', margin: 0,
              }}>{s.title}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
                {s.items.map(it => (
                  <li key={it} style={{
                    fontFamily: "'Inter'", fontSize: 14, color: '#2D3540',
                    padding: '8px 0', borderBottom: '1px solid rgba(14,37,67,0.08)',
                  }}>{it}</li>
                ))}
              </ul>
              <div style={{ marginTop: 'auto', paddingTop: 24 }}>
                <Editorial>Más Información</Editorial>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
