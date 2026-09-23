import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string): string {
  return format(parseISO(date), "dd/MM/yyyy", { locale: es })
}

export function formatDateLong(date: string): string {
  return format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })
}

export function formatTime(time: string): string {
  return time.slice(0, 5)
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function formatDayOfWeek(days: number[] | number): string {
  const arr = Array.isArray(days) ? [...days].sort((a, b) => a - b) : [days]
  if (arr.length === 0) return ''
  if (arr.length === 1) return DAYS[arr[0]] ?? ''
  
  const last = arr.pop()!
  return `${arr.map(d => DAYS[d]).join(', ')} y ${DAYS[last]}`
}

export function closestUpcomingDay(daysOfWeek: number[]): number {
  if (!daysOfWeek || daysOfWeek.length === 0) return new Date().getDay()
  const currentDay = new Date().getDay()
  
  let minDiff = 7
  let closestDay = daysOfWeek[0]
  for (const day of daysOfWeek) {
    const diff = (day - currentDay + 7) % 7 || 7
    if (diff < minDiff) {
      minDiff = diff
      closestDay = day
    }
  }
  return closestDay
}

export function nextOccurrenceOf(daysOfWeek: number[] | number): string {
  const days = Array.isArray(daysOfWeek) ? daysOfWeek : [daysOfWeek]
  if (days.length === 0) return new Date().toISOString().split('T')[0]
  
  const today = new Date()
  const currentDay = today.getDay()
  
  let minDiff = 7
  for (const day of days) {
    const diff = (day - currentDay + 7) % 7 || 7
    if (diff < minDiff) {
      minDiff = diff
    }
  }
  
  const next = new Date(today)
  next.setDate(today.getDate() + minDiff)
  return next.toISOString().split('T')[0]
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function playerColor(id: string): string {
  // Tonos un escalón más profundos que los originales: con texto blanco los
  // anteriores quedaban en ~3.1:1 y las iniciales no se leían.
  const colors = [
    '#15803d', '#1d4ed8', '#b91c1c', '#b45309',
    '#6d28d9', '#be185d', '#0e7490', '#4d7c0f',
  ]
  let hash = 0
  for (const ch of id) hash = ((hash << 5) - hash) + ch.charCodeAt(0)
  return colors[Math.abs(hash) % colors.length]
}

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function pricePerPlayer(total: number | null, count: number): string {
  if (!total || !count) return '-'
  return formatCurrency(total / count)
}
