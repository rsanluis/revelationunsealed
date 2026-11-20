import { describe, expect, test } from 'vitest'
import {
  DateParseError,
  determineExactMonthDayAndYear,
  determineMonthAndDay,
  localDate,
  monthDay,
  Operation,
} from '../src/dateUtils.js'

// Ported from esword-cli: src/test/java/com/codified/esword/util/DateUtilsTest.java

describe('DateUtils', () => {
  test('determineMonthAndDay: add 3117 days to 10/30 returns May 13', () => {
    expect(determineMonthAndDay(monthDay(10, 30), Operation.ADD, 3117)).toBe('May 13')
  })

  test('determineExactMonthDayAndYear: add 2300 days to 7/13/2024 returns October 30, 2030', () => {
    expect(determineExactMonthDayAndYear(localDate(2024, 7, 13), Operation.ADD, 2300)).toBe('October 30, 2030')
  })

  test('determineExactMonthDayAndYear: subtract 2300 days from 10/30/2030 returns July 13, 2024', () => {
    expect(determineExactMonthDayAndYear(localDate(2030, 10, 30), Operation.SUBTRACT, 2300)).toBe('July 13, 2024')
  })

  test('determineExactMonthDayAndYear: add 2300 days to 7/13/2024 returns October 30, 2030', () => {
    expect(determineExactMonthDayAndYear('7/13/2024', Operation.ADD, 2300)).toBe('October 30, 2030')
  })

  test('determineExactMonthDayAndYear: subtract 2300 days from 10/30/2030 returns July 13, 2024', () => {
    expect(determineExactMonthDayAndYear('10/30/2030', Operation.SUBTRACT, 2300)).toBe('July 13, 2024')
  })

  test('determineExactMonthDayAndYear: zero-padded string is accepted', () => {
    expect(determineExactMonthDayAndYear('07/13/2024', Operation.ADD, 2300)).toBe('October 30, 2030')
  })

  test('determineExactMonthDayAndYear: leap day string is valid', () => {
    expect(determineExactMonthDayAndYear('2/29/2024', Operation.ADD, 1)).toBe('March 1, 2024')
  })

  test('determineExactMonthDayAndYear: invalid leap day string throws', () => {
    expect(() => determineExactMonthDayAndYear('2/29/2023', Operation.ADD, 1)).toThrow(DateParseError)
  })

  test('determineExactMonthDayAndYear: wrong format string throws', () => {
    expect(() => determineExactMonthDayAndYear('2024-07-13', Operation.ADD, 1)).toThrow(DateParseError)
  })

  test('determineExactMonthDayAndYear: null string throws', () => {
    expect(() => determineExactMonthDayAndYear(null as unknown as string, Operation.ADD, 1)).toThrow(TypeError)
  })

  test('determineMonthAndDay: subtract 3117 days from 5/13 returns October 30', () => {
    expect(determineMonthAndDay(monthDay(5, 13), Operation.SUBTRACT, 3117)).toBe('October 30')
  })

  // G5479 - From G5463; cheerfulness, that is, calm delight: - gladness, X
  // greatly, (X be exceeding) joy (-ful, -fully, -fulness, -ous).
  test('determineMonthAndDay: subtract 5479 days from 10/30 returns October 30', () => {
    expect(determineMonthAndDay(monthDay(10, 30), Operation.SUBTRACT, 5479)).toBe('October 30')
  })

  test('determineMonthAndDay: add 5479 days to 10/30 returns October 30', () => {
    expect(determineMonthAndDay(monthDay(10, 30), Operation.ADD, 5479)).toBe('October 30')
  })

  test('determineMonthAndDay: null MonthDay throws', () => {
    expect(() => determineMonthAndDay(null as unknown as ReturnType<typeof monthDay>, Operation.ADD, 3117)).toThrow(
      TypeError,
    )
  })

  test('determineMonthAndDay: leap day is valid', () => {
    expect(() => determineMonthAndDay(monthDay(2, 29), Operation.ADD, 1)).not.toThrow()
  })
})
