import logoUrl from './rfdd-logo.png'
import wavesUrl from './pattern-waves.svg'
import styles from './AppHeader.module.css'

// Cuenta MOCK: solo visual. Todavía no hay auth ni sesión real (fuera de alcance
// de la etapa 1). El botón "Salir" no hace nada por ahora.
const ACCOUNT = {
  name: 'Benjamín Hinojo',
  role: 'Consultor',
  initials: 'BH',
}

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

      <div className={styles.account}>
        <span className={styles.identity}>
          <span className={styles.name}>{ACCOUNT.name}</span>
          <span className={styles.role}>{ACCOUNT.role}</span>
        </span>
        <span className={styles.avatar} aria-hidden="true">
          {ACCOUNT.initials}
        </span>
        <button type="button" className={styles.logout} title="(demo) cerrar sesión">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Salir
        </button>
      </div>
    </header>
  )
}
