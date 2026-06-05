import styles from './common.module.css'

export type IconName = 'check' | 'x' | 'spinner'

interface IconProps {
  name: IconName
  size?: number
  className?: string
  /** Si se pasa, el ícono es accesible (aria-label); si no, queda decorativo. */
  title?: string
}

// SVG inline, coloreado con `currentColor`. Sin librería de íconos.
export function Icon({ name, size = 16, className, title }: IconProps) {
  const cls = [styles.icon, name === 'spinner' ? styles.spinner : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {name === 'check' && <path d="M20 6 9 17l-5-5" />}
      {name === 'x' && <path d="M18 6 6 18M6 6l12 12" />}
      {name === 'spinner' && <path d="M21 12a9 9 0 1 1-6.219-8.56" />}
    </svg>
  )
}
