/* eslint-disable */
const DIFFS = [
  'Servicio altamente personalizado',
  'Más de 30 años de experiencia',
  'Manejo responsable de la información',
  'Involucramiento directo de los socios',
  'Especialistas en empresas familiares',
  'Experiencia en múltiples industrias',
];

window.Differentiators = function Differentiators() {
  return (
    <section style={{ background: '#F7F6F2', borderBottom: '1px solid #DEE2E8' }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto', padding: '40px 32px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
      }}>
        {DIFFS.map((d, i) => (
          <div key={d} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            paddingLeft: i % 3 === 0 ? 0 : 16,
            borderLeft: i % 3 === 0 ? 'none' : '1px solid #DEE2E8',
          }}>
            <span style={{ display: 'inline-block', width: 24, height: 1, background: '#0E2543' }}/>
            <span style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontWeight: 600, fontSize: 16, color: '#0E2543',
              lineHeight: 1.3,
            }}>{d}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
