import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRecentHistory } from '../src/data/health-history.mjs';

test('health chart selects the latest points and orders them chronologically regardless of storage order', () => {
  const history = [
    { at: '2026-11-15T12:00:00.000Z', readings: { sleep: 5.8 } },
    { at: '2026-11-13T12:00:00.000Z', readings: { sleep: 6.0 } },
    { at: '2026-11-14T12:00:00.000Z', readings: { sleep: 5.9 } },
    { at: '2026-11-12T12:00:00.000Z', readings: { heartRate: 70 } },
  ];
  const result = selectRecentHistory(history, 'sleep', 2);
  assert.deepEqual(result.map((item) => item.readings.sleep), [5.9, 5.8]);
});
