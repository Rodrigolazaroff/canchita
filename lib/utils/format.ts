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
export function formatDayOfWeek(day: number): string {
  return DAYS[day] ?? ''
}

export function nextOccurrenceOf(dayOfWeek: number): string {
  const today = new Date()
  const diff = (dayOfWeek - today.getDay() + 7) % 7 || 7
  const next = new Date(today)
  next.setDate(today.getDate() + diff)
  return next.toISOString().split('T')[0]
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function playerColor(id: string): string {
  const colors = [
    '#16a34a', '#2563eb', '#dc2626', '#d97706',
    '#7c3aed', '#db2777', '#0891b2', '#65a30d',
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
