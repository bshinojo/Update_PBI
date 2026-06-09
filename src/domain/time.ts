// Tiempo relativo en español para mostrar cuándo fue el último run
// ("recién", "hace 5 min", "hace 2 h", "ayer", "hace 3 días", o la fecha corta).
// Función pura (recibe `now` para poder testearla con reloj fijo).

const MINUTE_MS = 60_000

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''

  const diffMin = Math.floor((now.getTime() - then.getTime()) / MINUTE_MS)
  if (diffMin < 1) return 'recién' // incluye pequeños desfasajes de reloj (futuro)
  if (diffMin < 60) return `hace ${diffMin} min`

  const hours = Math.floor(diffMin / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`

  // Más de una semana: fecha corta (el detalle exacto va en el tooltip).
  return then.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
