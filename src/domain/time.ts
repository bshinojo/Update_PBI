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

const WEEKDAY_SHORT_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/** Offset fijo de ART (UTC-3): los horarios del producto se muestran SIEMPRE en
 * ART, sin importar la zona horaria del navegador (coincide con el label
 * "ART (UTC-3)" que acompaña a los horarios en la UI). */
const ART_OFFSET_MIN = -180

/** Reloj de pared en ART: instante desplazado para leerlo con getUTC*(). */
function artWall(d: Date): Date {
  return new Date(d.getTime() + ART_OFFSET_MIN * MINUTE_MS)
}

function wallHHmm(w: Date): string {
  const h = String(w.getUTCHours()).padStart(2, '0')
  const m = String(w.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function sameWallDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

/**
 * Cuándo es la PRÓXIMA corrida, en español compacto y en ART: "hoy 14:00",
 * "mañana 06:00", "lun 07:00" (dentro de la semana) o "30/06 23:00" (más lejos;
 * agrega el año si es otro). Devuelve '' si el ISO es inválido o quedó en el
 * pasado (dato viejo: mejor no afirmar nada).
 */
export function formatNextRun(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  if (then.getTime() < now.getTime() - MINUTE_MS) return ''

  const wThen = artWall(then)
  const wNow = artWall(now)
  const time = wallHHmm(wThen)
  if (sameWallDay(wThen, wNow)) return `hoy ${time}`
  const wTomorrow = new Date(wNow.getTime() + 24 * 60 * MINUTE_MS)
  if (sameWallDay(wThen, wTomorrow)) return `mañana ${time}`

  const diffDays = (then.getTime() - now.getTime()) / (24 * 60 * MINUTE_MS)
  if (diffDays < 7) return `${WEEKDAY_SHORT_ES[wThen.getUTCDay()]} ${time}`

  const dd = String(wThen.getUTCDate()).padStart(2, '0')
  const mm = String(wThen.getUTCMonth() + 1).padStart(2, '0')
  const year =
    wThen.getUTCFullYear() !== wNow.getUTCFullYear() ? `/${wThen.getUTCFullYear()}` : ''
  return `${dd}/${mm}${year} ${time}`
}

/**
 * Duración de una corrida, compacta: "32 s", "4 min", "1 h 12 min".
 * Devuelve '' si alguna fecha es inválida o el rango es negativo.
 */
export function formatRunDuration(startedIso: string, finishedIso: string): string {
  const a = new Date(startedIso)
  const b = new Date(finishedIso)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ''
  const sec = Math.round((b.getTime() - a.getTime()) / 1000)
  if (sec < 0) return ''
  if (sec < 60) return `${sec} s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const rest = min % 60
  return rest > 0 ? `${h} h ${rest} min` : `${h} h`
}
