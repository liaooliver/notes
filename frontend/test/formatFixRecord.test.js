import { expect, test } from 'vitest'
import { formatFixRecord } from '../src/utils/formatFixRecord.js'

test('formats a date and title into a fix record line', () => {
  expect(formatFixRecord('2026-09-17', 'Fix login bug')).toBe('2026-09-17 - Fix login bug')
})

test('throws when date is missing', () => {
  expect(() => formatFixRecord('', 'Fix login bug')).toThrow()
})

test('throws when title is missing', () => {
  expect(() => formatFixRecord('2026-09-17', '')).toThrow()
})
