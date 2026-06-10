/* eslint-disable */
const { useState } = React;

const FAQS = [
  {
    q: '¿Cuál es nuestra oferta de servicios diferencial sobre las consultoras de mercado?',
    a: 'Trabajamos en un equipo pequeño, en contacto directo con el cliente y con participación permanente de alguno de nuestros socios. Esto garantiza que los servicios los brinda un profesional experimentado, que interpreta las necesidades del cliente, evacúa sus inquietudes y lo acompaña en el proceso. Tenemos una vocación de compromiso de alta calidad con nuestros clientes, lo cual nos involucra de manera personal con las transacciones.',
  },
  {
    q: '¿Los valores de una valuación están al alcance de una Pyme?',
    a: 'RFDD ha rediseñado los procesos tradicionales de valuación de empresas de manera de contar con una gama de servicios de valuación, especialmente orientados para la satisfacción de las necesidades de las empresas medianas, adecuando las metodologías y logrando economías en los procedimientos utilizados.',
  },
  {
    q: '¿Qué significa actuar como piloto de crisis?',
    a: 'Las organizaciones suelen atravesar diversas crisis. Frecuentemente, estas situaciones son soportadas de manera traumática por la organización. Sin embargo, estas circunstancias pueden convertirse en excelentes oportunidades para incorporar los cambios y mejoras que la compañía necesita. RFDD realiza un diagnóstico objetivo y exhaustivo de la situación actual, elabora las alternativas de solución y acompaña al management o a los accionistas en todo el proceso de cambio.',
  },
  {
    q: '¿Puede RFDD convertirse en un hábil negociador externo?',
    a: 'Nuestro equipo está conformado por profesionales altamente calificados y con vasta experiencia en la negociación de condiciones con vistas al logro de objetivos de negocios.',
  },
];

window.FAQ = function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section style={{ background: '#fff', padding: '96px 0' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 32px' }}>
        <div style={{
          fontFamily: "'Inter'", fontWeight: 500, fontSize: 12,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: '#6B7585', marginBottom: 16,
        }}>Preguntas Frecuentes</div>
        <h2 style={{
          fontFamily: "'EB Garamond', serif",
          fontWeight: 500, fontSize: 44, lineHeight: 1.1,
          color: '#0E2543', margin: '0 0 48px',
        }}>Lo que solemos escuchar</h2>
        <div style={{ borderTop: '1px solid #DEE2E8' }}>
          {FAQS.map((f, i) => (
            <div key={i} style={{ borderBottom: '1px solid #DEE2E8' }}>
              <button onClick={() => setOpen(open === i ? -1 : i)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '24px 0',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  gap: 24,
                }}>
                <span style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontWeight: 600, fontSize: 19, color: '#0E2543',
                  lineHeight: 1.4,
                }}>{f.q}</span>
                <span style={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: 28, color: '#0E2543',
                  flexShrink: 0, lineHeight: 1,
                  transform: open === i ? 'rotate(45deg)' : 'rotate(0)',
                  transition: 'transform 240ms cubic-bezier(.2,.6,.2,1)',
                }}>+</span>
              </button>
              {open === i && (
                <div style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: 16, lineHeight: 1.7, color: '#2D3540',
                  paddingBottom: 28, paddingRight: 60,
                }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
