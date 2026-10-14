import { addDays } from './date'
import { DEFAULT_COMPANY_SETTINGS } from './types'
import type { Company, CompanySettings } from './types'

export const settingsOf = (c: Company | null | undefined): CompanySettings => ({ ...DEFAULT_COMPANY_SETTINGS, ...c?.settings })

/** When staff must have submitted availability for the week starting `weekStart`: date key and time. */
export function availabilityDeadline(weekStart: string, s: CompanySettings) {
  return { date: addDays(weekStart, s.availabilityDay - 7), time: s.availabilityTime }
}

export const deadlinePassed = (d: { date: string; time: string }, now = new Date()) => new Date(`${d.date}T${d.time}:00`) <= now
