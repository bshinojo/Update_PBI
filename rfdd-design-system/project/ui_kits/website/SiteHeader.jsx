/* eslint-disable */
const { useState, useEffect } = React;

window.SiteHeader = function SiteHeader({ activeRoute, onNavigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onHero = activeRoute === 'inicio' && !scrolled;

  const navStyle = {
    position: 'sticky', top: 0, zIndex: 50,
    transition: 'all 240ms cubic-bezier(.2,.6,.2,1)',
    background: onHero ? 'transparent' : 'rgba(247,246,242,0.92)',
    backdropFilter: onHero ? 'none' : 'blur(12px)',
    borderBottom: onHero ? '1px solid transparent' : '1px solid #DEE2E8',
    color: onHero ? '#F7F6F2' : '#0E2543',
  };

  const linkStyle = {
    fontFamily: "'Inter'", fontWeight: 500, fontSize: 13,
    letterSpacing: '0.04em', color: 'inherit',
    cursor: 'pointer', padding: '6px 0', textDecoration: 'none',
    position: 'relative',
  };

  const items = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'servicios', label: 'Servicios', sub: ['Fusiones y Adquisiciones', 'Consultoría Estratégica', 'Tableros de Gestión'] },
    { id: 'demos', label: 'Demos', sub: ['Tablero de Ventas', 'Tablero de Créditos', 'Tablero de Inventario', 'Tablero de Producción', 'Tablero de Resultados'] },
    { id: 'equipo', label: 'Equipo' },
    { id: 'informes', label: 'Informes' },
    { id: 'contacto', label: 'Contacto' },
  ];

  return (
    <header style={navStyle}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '18px 32px', display: 'flex', alignItems: 'center', gap: 32 }}>
        <a onClick={() => onNavigate('inicio')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="../../assets/logo.png"
               alt="Romano, Fiocca & Díaz Delfino"
               style={{
                 height: 40, transition: 'all 240ms',
                 filter: onHero ? 'brightness(0) invert(1)' : 'none',
               }} />
        </a>
        <nav style={{ display: 'flex', gap: 28, marginLeft: 'auto', alignItems: 'center' }}>
          {items.map(it => (
            <div key={it.id} style={{ position: 'relative' }}
                 onMouseEnter={() => setOpenMenu(it.id)}
                 onMouseLeave={() => setOpenMenu(null)}>
              <a style={{
                ...linkStyle,
                borderBottom: activeRoute === it.id ? '1.5px solid currentColor' : '1.5px solid transparent',
              }}
                 onClick={() => onNavigate(it.id)}>{it.label}</a>
              {it.sub && openMenu === it.id && (
                <div style={{
                  position: 'absolute', top: '100%', left: -16, marginTop: 8,
                  background: '#fff', border: '1px solid #DEE2E8', borderRadius: 6,
                  boxShadow: '0 8px 24px rgba(14,37,67,0.10)', padding: '8px 0',
                  minWidth: 240,
                }}>
                  {it.sub.map(s => (
                    <a key={s} style={{
                      display: 'block', padding: '8px 18px',
                      fontFamily: "'Inter'", fontSize: 13, color: '#0E2543',
                      cursor: 'pointer', textDecoration: 'none',
                    }}>{s}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <a style={{
            ...linkStyle,
            border: '1px solid currentColor',
            padding: '8px 16px', borderRadius: 4, marginLeft: 8,
          }}>Iniciar Sesión</a>
        </nav>
      </div>
    </header>
  );
};
