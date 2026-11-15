import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { METRIC_DEFINITIONS, metricLabel, readHealthSnapshot } from '../src/health-state.js';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
const recent = () => new Date().toISOString();
beforeEach(() => values.clear());

test('all unrecorded indicators are UNKNOWN and absent from assessment inputs', () => {
  const snapshot = readHealthSnapshot();
  assert.equal(snapshot.readings.length, METRIC_DEFINITIONS.length);
  assert.ok(snapshot.readings.every((item) => item.value === null && item.status === 'unknown'));
  assert.equal(snapshot.assessment.overallState, 'unknown');
  assert.equal(snapshot.currentReadings.length, 0);
  assert.equal(metricLabel('unknown'), 'NOT RECORDED');
});

test('partial check-in preserves recorded provenance and leaves every other metric unknown', () => {
  values.set('orbital-metrics', JSON.stringify([{ id: 'heartRate', value: 76, at: recent(), missionContext: { location: 'iss', gravity: 'microgravity' } }]));
  values.set('valmed-mission-context-v1', JSON.stringify({ location: 'iss', gravity: 'microgravity' }));
  const snapshot = readHealthSnapshot();
  assert.equal(snapshot.readings.find((item) => item.id === 'heartRate').status, 'logged');
  assert.equal(snapshot.readings.find((item) => item.id === 'bloodPressure').status, 'unknown');
  assert.equal(snapshot.currentReadings.length, 1);
  assert.ok(snapshot.assessment.missing.some((item) => item.metricId === 'bloodPressure'));
  assert.ok(snapshot.assessment.overallState !== 'normal');
});

test('synthetic records are explicitly labeled and a different mission excludes them', () => {
  values.set('orbital-metrics', JSON.stringify([{ id: 'heartRate', value: 76, at: recent(), demoMissionId: 'valmed-lunar-150d-synthetic-v2' }]));
  values.set('valmed-mission-context-v1', JSON.stringify({ location: 'lunar_surface', gravity: 'lunar' }));
  assert.equal(readHealthSnapshot().readings[0].status, 'synthetic');
  values.set('valmed-mission-context-v1', JSON.stringify({ location: 'iss', gravity: 'microgravity' }));
  const switched = readHealthSnapshot();
  assert.equal(switched.readings[0].status, 'context-mismatch');
  assert.equal(switched.currentReadings.length, 0);
  assert.equal(switched.assessment.overallState, 'unknown');
});

test('stale saved readings remain visible but are not treated as current', () => {
  values.set('orbital-metrics', JSON.stringify([{ id: 'sleep', value: 7, at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), missionContext: { location: 'earth', gravity: 'earth' } }]));
  const snapshot = readHealthSnapshot();
  assert.equal(snapshot.readings.find((item) => item.id === 'sleep').status, 'stale');
  assert.equal(snapshot.currentReadings.length, 0);
  assert.equal(snapshot.assessment.overallState, 'unknown');
});
