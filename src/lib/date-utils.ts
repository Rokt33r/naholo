import { format, isToday, isThisWeek, isThisYear } from 'date-fns'

/**
 * Format issue date based on recency:
 * - Within a day: "HH:mm" (e.g., "14:30")
 * - Within a week: "EEE" (e.g., "Mon")
 * - Within a year: "MMM d" (e.g., "Oct 2")
 * - Else: "yyyy MMM" (e.g., "2024 Oct")
 */
export function formatIssueDate(date: string | Date): string {
  if (isToday(date)) {
    return format(date, 'HH:mm')
  }

  if (isThisWeek(date, { weekStartsOn: 0 })) {
    return format(date, 'EEE')
  }

  if (isThisYear(date)) {
    return format(date, 'MMM d')
  }

  return format(date, 'yyyy MMM')
}
