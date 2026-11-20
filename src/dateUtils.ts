// TypeScript port of com.codified.esword.util.DateUtils (esword-cli).
// All arithmetic is done in UTC so local time zones / DST never shift a date.

export enum Operation {
  ADD = '+',
  SUBTRACT = '-',
}

/** A calendar date without time (equivalent of java.time.LocalDate). Month is 1-12. */
export interface LocalDate {
  year: number
  month: number
  day: number
}

/** A month/day without a year (equivalent of java.time.MonthDay). Month is 1-12. */
export interface MonthDay {
  month: number
  day: number
}

/** Thrown when a date string is not a valid month/day/year date (like Java's DateTimeParseException). */
export class DateParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DateParseError'
  }
}

// We start at 1600, after most countries adopted the Gregorian calendar, and end at 2030,
// the last year this app uses. Percentages are effectively the same as starting at year 1.
const START_YEAR = 1600
const END_YEAR = 2030

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const INPUT_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

export const localDate = (year: number, month: number, day: number): LocalDate => ({ year, month, day })
export const monthDay = (month: number, day: number): MonthDay => ({ month, day })

const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate()

const isValidDate = (year: number, month: number, day: number): boolean =>
  month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)

const isValidYearFor = (md: MonthDay, year: number): boolean =>
  !(md.month === 2 && md.day === 29 && !isLeapYear(year))

function applyOperation(date: LocalDate, operation: Operation, days: number): LocalDate {
  const delta = operation === Operation.ADD ? days : -days
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + delta))
  return { year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() }
}

const formatMonthDay = (md: MonthDay): string => `${MONTH_NAMES[md.month - 1]} ${md.day}`
const formatWithYear = (date: LocalDate): string => `${formatMonthDay(date)}, ${date.year}`

function requireNonNull<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new TypeError(message)
  }
  return value
}

/** Parses a month/day/year string such as "7/13/2024" or "07/13/2024", strictly. */
export function parseDate(text: string): LocalDate {
  const match = INPUT_PATTERN.exec(text.trim())
  if (!match) {
    throw new DateParseError(`Text '${text}' could not be parsed as M/d/yyyy`)
  }
  const [month, day, year] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (!isValidDate(year, month, day)) {
    throw new DateParseError(`Text '${text}' is not a valid date`)
  }
  return { year, month, day }
}

/**
 * Adds or subtracts `days` days to/from the given date (a LocalDate, or a string in
 * month/day/year format) and returns the exact resulting date, e.g. "October 30, 2030".
 *
 * @throws DateParseError if a string date is not a valid month/day/year date
 */
export function determineExactMonthDayAndYear(date: LocalDate | string, operation: Operation, days: number): string {
  requireNonNull(date, 'date must not be null')
  requireNonNull(operation, 'operation must not be null')
  const start = typeof date === 'string' ? parseDate(date) : date
  return formatWithYear(applyOperation(start, operation, days))
}

/**
 * Applies the given month/day to every year from START_YEAR to END_YEAR, adds or subtracts
 * `days` days, and returns the resulting month/day that occurs most often, e.g. "May 13".
 * Ties are broken by the earliest month/day in the calendar.
 */
export function determineMonthAndDay(startMonthDay: MonthDay, operation: Operation, days: number): string {
  requireNonNull(startMonthDay, 'startMonthDay must not be null')
  requireNonNull(operation, 'operation must not be null')

  // key = month * 100 + day, so numeric order equals calendar order
  const hits = new Map<number, number>()
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    // Skip years where the start date doesn't exist (e.g. Feb 29 in non-leap years)
    if (!isValidYearFor(startMonthDay, year)) {
      continue
    }
    const result = applyOperation({ year, ...startMonthDay }, operation, days)
    const key = result.month * 100 + result.day
    hits.set(key, (hits.get(key) ?? 0) + 1)
  }

  let winnerKey = -1
  let winnerCount = -1
  for (const [key, count] of hits) {
    if (count > winnerCount || (count === winnerCount && key < winnerKey)) {
      winnerKey = key
      winnerCount = count
    }
  }
  return formatMonthDay({ month: Math.floor(winnerKey / 100), day: winnerKey % 100 })
}
