import styles from './WelcomeGuide.module.css'

// Pantalla de bienvenida que se muestra en el workspace especial "--GENERAL--"
// (no es un workspace real de Power BI). Reemplaza la tabla/rail por un
// instructivo breve mientras el usuario no eligió un workspace real.
const STEPS: { t: string; d: string }[] = [
  {
    t: 'Elegí un workspace y un modelo',
    d: 'Usá los selectores de la izquierda para ubicar el modelo semántico que querés mantener al día.',
  },
  {
    t: 'Marcá qué actualizar',
    d: 'Seleccioná los orígenes de datos (o las tablas) que necesitás refrescar.',
  },
  {
    t: 'Definí la frecuencia',
    d: 'En el panel de la derecha elegí cada cuánto y el tipo de actualización: completa, solo datos o solo cálculo.',
  },
  {
    t: 'Programá',
    d: 'Listo. La actualización corre sola a la hora indicada, sin que tengas que abrir nada.',
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
            <li key={s.t} className={styles.step}>
              <span className={styles.num}>{i + 1}</span>
              <div>
                <div className={styles.stepTitle}>{s.t}</div>
                <div className={styles.stepText}>{s.d}</div>
              </div>
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
