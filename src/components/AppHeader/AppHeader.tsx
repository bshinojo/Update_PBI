import { useHealth } from '../../hooks/useHealth'
import { formatRelativeTime } from '../../domain/time'
import logoUrl from './rfdd-logo.png'
import wavesUrl from './pattern-waves.svg'
import styles from './AppHeader.module.css'

// Barra superior NAVY con la identidad RFDD (footer/hero de la marca): logo
// invertido sobre fondo navy, watermark de olas y eyebrow en gold. A la derecha,
// el indicador de salud del programador (GET /health): la promesa del producto es
// "corre solo", así que si el worker se cae tiene que VERSE acá, no descubrirse
// por datos viejos.
export function AppHeader() {
  return (
    <header className={styles.bar}>
      <img className={styles.waves} src={wavesUrl} alt="" aria-hidden="true" />

      <div className={styles.brand}>
        <img className={styles.logo} src={logoUrl} alt="Romano, Fiocca & Díaz Delfino" />
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.titles}>
          <h1 className={styles.title}>Programador de Actualizaciones</h1>
        </div>
      </div>

      <HealthPill />
    </header>
  )
}

function HealthPill() {
  const health = useHealth()

  if (health.kind === 'loading') return null

  const view =
    health.kind === 'ok'
      ? {
          cls: styles.healthOk,
          dot: styles.dotOk,
          text: 'Programador activo',
          title: health.lastTickAt
            ? `El programador está corriendo (último ciclo: ${formatRelativeTime(health.lastTickAt)}).`
            : 'El programador está corriendo.',
        }
      : health.kind === 'scheduler-down'
        ? {
            cls: styles.healthBad,
            dot: styles.dotBad,
            text: 'Programador detenido',
            title:
              'La API responde pero el programador no está corriendo: las actualizaciones programadas NO se van a disparar. Avisale a quien administra el servidor.',
          }
        : {
            cls: styles.healthBad,
            dot: styles.dotBad,
            text: 'Sin conexión',
            title: 'No se pudo hablar con el servidor. Revisá tu conexión o avisale a quien lo administra.',
          }

  return (
    <span
      className={`${styles.health} ${view.cls}`}
      title={view.title}
      role="status"
      aria-live="polite"
    >
      <span className={`${styles.dot} ${view.dot}`} aria-hidden="true" />
      {view.text}
    </span>
  )
}
