/* eslint-disable */
const { useState, useEffect } = React;

const SLIDES = [
  {
    eyebrow: 'Fusiones y Adquisiciones',
    title: 'Te asesoramos para comprar o vender una compañía.',
    lead: 'Te ayudamos a atravesar el proceso de compraventa de una compañía, cuidando tus datos con la más alta responsabilidad.',
    primary: 'Contáctanos',
    secondary: 'Más Info',
  },
  {
    eyebrow: 'Valuaciones',
    title: 'Conocé el valor de tu empresa.',
    lead: 'Calculamos el valor de tu compañía y te mostramos la sensibilidad de este a cambios en las principales variables que afectan a tu negocio.',
    primary: 'Contáctanos',
    secondary: 'Más Info',
  },
  {
    eyebrow: 'Tableros de Gestión',
    title: 'Toda la información de tu empresa en un solo click.',
    lead: 'Diseñamos tableros a medida para cada cliente que generan información relevante para la toma de decisiones de manera dinámica, flexible y visual.',
    primary: 'Contáctanos',
    secondary: 'Más Info',
  },
];

window.Hero = function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  }, []);
  const slide = SLIDES[i];

  return (
    <section style={{
      position: 'relative',
      minHeight: 720,
      marginTop: -82, // tuck under transparent header
      background: 'linear-gradient(135deg, #0E2543 0%, #163058 50%, #1E3D6E 100%)',
      color: '#F7F6F2',
      overflow: 'hidden',
    }}>
      {/* Wave watermark */}
      <img src="../../assets/pattern-waves.svg" alt=""
           style={{ position: 'absolute', bottom: 80, left: 0, width: '100%', opacity: 0.18 }}/>

      <div style={{
        maxWidth: 1240, margin: '0 auto', padding: '180px 32px 120px',
        position: 'relative', zIndex: 2,
      }}>
        <div key={i} style={{ animation: 'fadeUp 600ms cubic-bezier(.2,.6,.2,1)' }}>
          <div style={{
            fontFamily: "'Inter'", fontWeight: 500, fontSize: 12,
            letterSpacing: '0.32em', textTransform: 'uppercase',
            color: '#C9A24E', marginBottom: 24,
          }}>{slide.eyebrow}</div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 500, fontSize: 72, lineHeight: 1.05,
            letterSpacing: '-0.01em', maxWidth: 880,
            margin: 0, color: '#F7F6F2',
          }}>{slide.title}</h1>
          <p style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontWeight: 400, fontSize: 19, lineHeight: 1.6,
            color: 'rgba(247,246,242,0.85)',
            maxWidth: 620, marginTop: 28,
          }}>{slide.lead}</p>
          <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
            <Button variant="on-dark-primary">{slide.primary}</Button>
            <Button variant="on-dark-secondary">{slide.secondary}</Button>
          </div>
        </div>

        {/* Slider dots */}
        <div style={{ display: 'flex', gap: 10, marginTop: 80, alignItems: 'center' }}>
          {SLIDES.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={`Slide ${idx+1}`}
              style={{
                width: idx === i ? 32 : 8, height: 2, padding: 0, border: 'none',
                background: idx === i ? '#F7F6F2' : 'rgba(247,246,242,0.4)',
                cursor: 'pointer', transition: 'all 240ms',
              }}/>
          ))}
          <span style={{
            marginLeft: 16,
            fontFamily: "'Inter'", fontSize: 11, letterSpacing: '0.2em',
            color: 'rgba(247,246,242,0.6)',
          }}>{String(i+1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};
