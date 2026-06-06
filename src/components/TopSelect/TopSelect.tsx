import styles from './TopSelect.module.css'

interface Option {
  id: string
  name: string
}

interface TopSelectProps {
  label: string
  value: string | null
  options: Option[]
  loading?: boolean
  disabled?: boolean
  /** Ids que se muestran destacados (cursiva + gold), p. ej. el workspace "--GENERAL--". */
  specialIds?: string[]
  onChange: (id: string) => void
}

// Selector compacto del header (reemplaza las columnas de navegación). Maneja
// los estados de carga / sin resultados con su propia opción placeholder.
export function TopSelect({
  label,
  value,
  options,
  loading,
  disabled,
  specialIds,
  onChange,
}: TopSelectProps) {
  const isDisabled = disabled || loading || (!options.length && !loading)
  const placeholder = loading
    ? 'Cargando…'
    : disabled
      ? '—'
      : options.length === 0
        ? 'Sin resultados'
        : 'Elegí…'
  const valueIsSpecial = value != null && (specialIds?.includes(value) ?? false)

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>{label}</span>
      <select
        className={`${styles.select} ${valueIsSpecial ? styles.special : ''}`}
        value={value ?? ''}
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {value === null || value === '' ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option
            key={o.id}
            value={o.id}
            className={specialIds?.includes(o.id) ? styles.specialOption : undefined}
          >
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )
}
