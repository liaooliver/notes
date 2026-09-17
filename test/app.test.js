const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatFixRecord } = require('../src/app.js');

test('formats a date and title into a fix record line', () => {
  assert.equal(formatFixRecord('2026-09-17', 'Fix login bug'), '2026-09-17 - Fix login bug');
});

test('throws when date is missing', () => {
  assert.throws(() => formatFixRecord('', 'Fix login bug'));
});

test('throws when title is missing', () => {
  assert.throws(() => formatFixRecord('2026-09-17', ''));
});
