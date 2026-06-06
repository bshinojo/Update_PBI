/* eslint-disable */
window.SiteFooter = function SiteFooter() {
  const cols = [
    {
      title: 'Fusiones y Adquisiciones',
      items: ['Compra-Venta de Compañías', 'Valuación de Empresas', 'Transacciones Destacadas'],
    },
    {
      title: 'Consultoría Estratégica',
      items: ['Control de Gestión', 'Presupuestos', 'Estrategia Corporativa', 'Evaluación de Proyectos'],
    },
    {
      title: 'Tableros de Gestión',
      items: ['Ventas', 'Créditos y Cobranzas', 'Inventario', 'Producción', 'Resultados'],
    },
  ];

  return (
    <footer style={{
      background: '#0E2543', color: '#F7F6F2', position: 'relative',
      paddingTop: 80, paddingBottom: 32,
      overflow: 'hidden',
    }}>
      <img src="../../assets/pattern-waves.svg" alt=""
           style={{ position: 'absolute', top: 0, left: 0, width: '100%', opacity: 0.12 }}/>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', position: 'relative' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', gap: 40,
        }}>
          <div>
            <img src="../../assets/logo.png" alt="Romano, Fiocca & Díaz Delfino"
                 style={{ width: 240, filter: 'brightness(0) invert(1)' }}/>
            <p style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: 14, lineHeight: 1.6,
              color: 'rgba(247,246,242,0.7)',
              marginTop: 24, maxWidth: 280,
            }}>Acompañamos a empresas medianas y familiares a tomar mejores decisiones desde 1992.</p>
          </div>
          {cols.map(c => (
            <div key={c.title}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500, fontSize: 18, color: '#F7F6F2',
                marginBottom: 16,
              }}>{c.title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {c.items.map(it => (
                  <li key={it} style={{
                    fontFamily: "'Inter'", fontSize: 13, lineHeight: 2,
                    color: 'rgba(247,246,242,0.7)',
                    cursor: 'pointer',
                  }}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500, fontSize: 18, color: '#F7F6F2',
              marginBottom: 16,
            }}>Newsletter</div>
            <div style={{
              fontFamily: "'Inter'", fontSize: 13, color: 'rgba(247,246,242,0.7)',
              marginBottom: 12, lineHeight: 1.5,
            }}>Análisis trimestral del mercado argentino.</div>
            <div style={{ display: 'flex', gap: 0 }}>
              <input placeholder="EMAIL" style={{
                flex: 1, background: 'transparent', border: '1px solid rgba(247,246,242,0.3)',
                borderRight: 'none', padding: '10px 12px', color: '#F7F6F2',
                fontFamily: "'Inter'", fontSize: 13, letterSpacing: '0.18em',
                outline: 'none',
              }}/>
              <button style={{
                background: '#F7F6F2', color: '#0E2543',
                border: 'none', padding: '0 18px', cursor: 'pointer',
                fontFamily: "'Inter'", fontWeight: 600, fontSize: 12,
                letterSpacing: '0.1em',
              }}>→</button>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 64, paddingTop: 24,
          borderTop: '1px solid rgba(247,246,242,0.15)',
          display: 'flex', justifyContent: 'space-between',
          fontFamily: "'Inter'", fontSize: 12,
          color: 'rgba(247,246,242,0.5)',
        }}>
          <span>© 2024 · Romano, Fiocca &amp; Díaz Delfino</span>
          <span>Buenos Aires, Argentina</span>
        </div>
      </div>
    </footer>
  );
};
