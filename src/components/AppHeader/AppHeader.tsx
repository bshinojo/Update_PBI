import logoUrl from './rfdd-logo.png'
import wavesUrl from './pattern-waves.svg'
import styles from './AppHeader.module.css'

// Barra superior NAVY con la identidad RFDD (footer/hero de la marca): logo
// invertido sobre fondo navy, watermark de olas y eyebrow en gold.
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
    </header>
  )
}
