import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAssessment } from '../src/services/assessment.js';

test('legacy assessment entry point delegates to the canonical engine', () => {
  const result = evaluateAssessment({
    readings: [{ id: 'heartRate', name: 'Heart rate', unit: 'bpm', value: 74 }],
    now: Date.parse('2026-11-15T12:00:00Z'),
  });
  assert.equal(result.engineVersion, '1.1.0');
  assert.equal(result.overallState, 'unknown');
  assert.equal(result.findings[0].state, 'unknown');
  assert.match(result.findings[0].reasons.join(' '), /No personal reference/i);
});

test('no thresholds or range shortcut are inferred by the compatibility module', () => {
  const result = evaluateAssessment({ readings: [{ id: 'heartRate', unit: 'bpm', value: 999 }] });
  assert.equal(result.overallState, 'unknown');
  assert.equal(result.findings[0].state, 'unknown');
});
