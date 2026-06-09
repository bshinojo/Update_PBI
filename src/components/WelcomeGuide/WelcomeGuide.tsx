import type { ReactNode } from 'react'
import styles from './WelcomeGuide.module.css'

// Pantalla de bienvenida que se muestra en el workspace especial "--GENERAL--"
// (no es un workspace real de Power BI). Reemplaza la tabla/rail por un
// instructivo breve mientras el usuario no eligió un workspace real.

// SVG de línea, en paleta RFDD (coloreado con `currentColor`). Sin librería de íconos.
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.glyph}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const STEPS: { t: string; d: string; icon: ReactNode }[] = [
  {
    t: 'Elegí un workspace y un modelo',
    d: 'Usá los selectores de la izquierda para ubicar el modelo semántico que querés mantener al día.',
    icon: (
      <Glyph>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12.5 9 5 9-5" />
      </Glyph>
    ),
  },
  {
    t: 'Marcá qué actualizar',
    d: 'Seleccioná los orígenes de datos (o las tablas) que necesitás refrescar.',
    icon: (
      <Glyph>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <path d="m8 12 2.5 2.5L16 9" />
      </Glyph>
    ),
  },
  {
    t: 'Definí la frecuencia',
    d: 'En el panel de la derecha elegí cada cuánto y el tipo de actualización: completa, solo datos o solo cálculo.',
    icon: (
      <Glyph>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </Glyph>
    ),
  },
  {
    t: 'Programá',
    d: 'Listo. La actualización corre sola a la hora indicada, sin que tengas que abrir nada.',
    icon: (
      <Glyph>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
        <path d="m9 15 2 2 4-4" />
      </Glyph>
    ),
  },
]

export function WelcomeGuide() {
  return (
    <div className={styles.wrap}>
      <article className={styles.card}>
        <p className={styles.eyebrow}>Guía rápida</p>
        <h1 className={styles.title}>Programá actualizaciones de Power BI sin escribir código</h1>
        <p className={styles.lead}>
          Estás en <em>--GENERAL--</em>. Elegí un workspace en el selector de la izquierda para empezar.
        </p>

        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s.t} className={styles.step} style={{ animationDelay: `${i * 90}ms` }}>
              <span className={styles.num}>{i + 1}</span>
              <div className={styles.body}>
                <div className={styles.stepTitle}>{s.t}</div>
                <div className={styles.stepText}>{s.d}</div>
              </div>
              <span className={styles.glyphWrap}>{s.icon}</span>
            </li>
          ))}
        </ol>

        <p className={styles.note}>
          <strong>Tené en cuenta:</strong> los horarios son en ART (UTC-3) y las actualizaciones
          corren mientras el servidor esté activo.
        </p>
      </article>
    </div>
  )
}
