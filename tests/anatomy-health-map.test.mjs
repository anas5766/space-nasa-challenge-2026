import test from 'node:test';
import assert from 'node:assert/strict';
import { anatomySymptomLevel, symptomsForAnatomyStructure } from '../src/anatomy-health-map.mjs';

const recent = (kind, region, severity = 4, extra = {}) => ({ kind, region, severity, status: severity >= 8 ? 'critical' : severity >= 5 ? 'moderate' : 'warning', at: new Date().toISOString(), ...extra });

test('muscle soreness in the leg flags leg muscles but not leg bones', () => {
  const symptoms = [recent('muscle', 'leg', 4)];
  assert.equal(anatomySymptomLevel('quadriceps_femoris', symptoms), 'warning');
  assert.equal(anatomySymptomLevel('femur', symptoms), 'normal');
});

test('nausea maps to gastrointestinal structures only when abdomen is selected', () => {
  assert.equal(anatomySymptomLevel('stomach', [recent('nausea', 'abdomen')]), 'warning');
  assert.equal(anatomySymptomLevel('stomach', [recent('nausea', 'general')]), 'normal');
  assert.equal(anatomySymptomLevel('femur', [recent('nausea', 'abdomen')]), 'normal');
});

test('breathing and vision symptoms map to their corresponding anatomical structures', () => {
  assert.equal(anatomySymptomLevel('left_lung', [recent('breathing', 'chest', 2)]), 'critical');
  assert.equal(anatomySymptomLevel('retina', [recent('vision', 'head', 8)]), 'critical');
  assert.equal(anatomySymptomLevel('heart', [recent('breathing', 'chest', 2)]), 'normal');
  assert.equal(anatomySymptomLevel('quadriceps_femoris', [recent('weakness', 'leg', 2)]), 'critical');
});

test('systemic symptoms and mission hazards do not create anatomical flags', () => {
  const symptoms = [recent('confusion', 'head', 9), recent('fainting', 'general', 8)];
  assert.equal(anatomySymptomLevel('brain', symptoms), 'normal');
  assert.equal(anatomySymptomLevel('heart', symptoms), 'normal');
  assert.deepEqual(symptomsForAnatomyStructure('brain', symptoms), []);
});

test('only the highest matching recent symptom severity is shown', () => {
  const symptoms = [recent('muscle', 'leg', 2), recent('muscle', 'leg', 7)];
  assert.equal(anatomySymptomLevel('gastrocnemius', symptoms), 'moderate');
  assert.equal(symptomsForAnatomyStructure('gastrocnemius', symptoms).length, 2);
});
