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

const QUICKCHART_URL = 'https://quickchart.io/chart?v=4&c='
// Pie slice colors by rank: 1st = green, 2nd = blue, 3rd = dark blue
const RANK_COLORS = ['#2E9E44', '#3B82F6', '#1E3A8A']
const OTHER_COLOR = '#B0B0B0'

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

// key = month * 100 + day, so numeric order equals calendar order
const toKey = (md: MonthDay): number => md.month * 100 + md.day
const fromKey = (key: number): MonthDay => ({ month: Math.floor(key / 100), day: key % 100 })

const percent = (count: number, total: number): string => `${((count * 100) / total).toFixed(2)}%`

const escapeJson = (text: string): string => text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

// Matches Java's URLEncoder.encode(..., UTF_8): spaces become '+', and !'()~ are percent-encoded
const urlEncode = (text: string): string =>
  encodeURIComponent(text)
    .replace(/%20/g, '+')
    .replace(/[!'()~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

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
  const formatted = formatWithYear(applyOperation(start, operation, days))
  console.info(`${formatWithYear(start)} ${operation} ${days} days -> ${formatted}`)
  return formatted
}

/**
 * Applies the given month/day to every year from START_YEAR to END_YEAR, adds or subtracts
 * `days` days, and returns the resulting month/day that occurs most often, e.g. "May 13".
 * Ties are broken by the earliest month/day in the calendar.
 */
export function determineMonthAndDay(startMonthDay: MonthDay, operation: Operation, days: number): string {
  requireNonNull(startMonthDay, 'startMonthDay must not be null')
  requireNonNull(operation, 'operation must not be null')

  // Keyed by toKey(); sorted below so iteration follows calendar order (like Java's TreeMap)
  const unsorted = new Map<number, number>()
  let total = 0
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    // Skip years where the start date doesn't exist (e.g. Feb 29 in non-leap years)
    if (!isValidYearFor(startMonthDay, year)) {
      continue
    }
    const key = toKey(applyOperation({ year, ...startMonthDay }, operation, days))
    unsorted.set(key, (unsorted.get(key) ?? 0) + 1)
    total++
  }
  const hits = new Map([...unsorted].sort(([a], [b]) => a - b))

  const start = formatMonthDay(startMonthDay)
  for (const [key, count] of hits) {
    console.info(
      `   ${start} ${operation} ${days} days -> ${formatMonthDay(fromKey(key))}: ${count} matches (${percent(count, total)})`,
    )
  }

  let winnerKey = -1
  let winnerCount = -1
  for (const [key, count] of hits) {
    if (count > winnerCount || (count === winnerCount && key < winnerKey)) {
      winnerKey = key
      winnerCount = count
    }
  }

  const formatted = formatMonthDay(fromKey(winnerKey))
  console.info(
    `[${formatted}] is the Month/Day result with the most matches: ${winnerCount} matches (${percent(winnerCount, total)})`,
  )
  const pieChartTitle =
    operation === Operation.ADD
      ? `Adding ${days} days to ${start} for years ${START_YEAR} to ${END_YEAR}`
      : `Subtracting ${days} days from ${start} for years ${START_YEAR} to ${END_YEAR}`
  const mainTitle = formatted
  console.info(`Pie chart: ${buildPieChartUrl(hits, total, mainTitle, pieChartTitle)}`)
  return formatted
}

/**
 * Builds a QuickChart.io URL (which renders Chart.js configs as images) for a pie chart with
 * one slice per month/day, labeled with the date and its percentage of all matches.
 * `hits` is keyed by month * 100 + day and must iterate in calendar order.
 */
export function buildPieChartUrl(hits: Map<number, number>, total: number, mainTitle: string, subTitle: string): string {
  // Rank slices by match count (ties -> earliest date) to assign the top colors
  const ranked = [...hits].sort(([ka, ca], [kb, cb]) => cb - ca || ka - kb).map(([key]) => key)

  const labels: string[] = []
  const data: string[] = []
  const colors: string[] = []
  const matches: string[] = []
  for (const [key, count] of hits) {
    matches.push(String(count))
    labels.push(`"${formatMonthDay(fromKey(key))} (${percent(count, total)})"`)
    data.push(((count * 100) / total).toFixed(2))
    const rank = ranked.indexOf(key)
    colors.push(`"${rank < RANK_COLORS.length ? RANK_COLORS[rank] : OTHER_COLOR}"`)
  }
  const list = (items: string[]): string => `[${items.join(',')}]`
  const config =
    `{"type":"pie","data":{"labels":${list(labels)}` +
    `,"datasets":[{"data":${list(data)},"backgroundColor":${list(colors)}` +
    `,"matches":${list(matches)}}]}` +
    // QuickChart bundles chartjs-plugin-datalabels; draw date, match count and percent on
    // three lines inside each slice. Chart.js 4 (subtitles need 3.4+): titles live under options.plugins
    ',"options":{"plugins":{' +
    `"title":{"display":true,"text":"${escapeJson(mainTitle)}",` +
    `"color":"${RANK_COLORS[0]}","font":{"weight":"bold"}},` +
    `"subtitle":{"display":true,"text":"${escapeJson(subTitle)}",` +
    '"font":{"weight":"bold"}},' +
    '"datalabels":{"color":"#FFFFFF","font":{"weight":"bold","size":8},' +
    '"textAlign":"center","formatter":(v,ctx)=>[ctx.chart.data.labels[ctx.dataIndex]' +
    ".replace(/ \\(.*/,''),ctx.dataset.matches[ctx.dataIndex]+' matches',v.toFixed(2)+'%']}}}}"
  return QUICKCHART_URL + urlEncode(config)
}
