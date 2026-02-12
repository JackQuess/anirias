import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldCorrectAiringAt } from '../services/airingCorrection.js';

test('corrects when difference is greater than 6 hours', () => {
  const planned = '2026-02-12T18:00:00.000Z';
  const released = '2026-02-13T01:30:00.000Z';
  assert.equal(shouldCorrectAiringAt(planned, released), true);
});

test('does not correct when difference is within 6 hours', () => {
  const planned = '2026-02-12T18:00:00.000Z';
  const released = '2026-02-12T22:00:00.000Z';
  assert.equal(shouldCorrectAiringAt(planned, released), false);
});

test('corrects when planned time is missing', () => {
  const released = '2026-02-12T22:00:00.000Z';
  assert.equal(shouldCorrectAiringAt(null, released), true);
});
