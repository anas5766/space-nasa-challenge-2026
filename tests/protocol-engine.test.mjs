import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProtocol, PROTOCOLS } from '../src/protocols/protocol-engine.mjs';

test('all offered protocols have structured follow-up questions', () => {
  for (const [id, protocol] of Object.entries(PROTOCOLS)) {
    assert.ok(protocol.questions.length >= 3, `${id} needs follow-up questions`);
    assert.equal(new Set(protocol.questions.map((q) => q.id)).size, protocol.questions.length);
  }
});

test('red-flag responses force emergency guidance', () => {
  const result = evaluateProtocol({ symptom: 'headache', answers: { sudden: 'yes' } });
  assert.equal(result.level, 'emergency');
  assert.match(result.guidance, /emergency medical checklist/i);
  assert.match(result.guidance, /flight surgeon/i);
});

test('chest and breathing symptoms are escalated even without answers', () => {
  assert.equal(evaluateProtocol({ symptom: 'chest' }).level, 'urgent');
  assert.equal(evaluateProtocol({ symptom: 'breathing' }).level, 'urgent');
});

test('non-red-flag symptoms do not trigger emergency language or medication', () => {
  const result = evaluateProtocol({ symptom: 'nausea', answers: { persistent: 'no', blood: 'no', worse: 'no' } });
  assert.equal(result.level, 'monitor');
  assert.doesNotMatch(result.guidance, /prescribe|\b\d+\s?mg\b/i);
});

test('an uncertain answer is never treated as an all-clear', () => {
  const result = evaluateProtocol({ symptom: 'nausea', answers: { persistent: 'unsure', blood: 'no', worse: 'no' } });
  assert.equal(result.level, 'urgent');
});

test('unknown symptom safely routes to generic protocol', () => {
  assert.equal(evaluateProtocol({ symptom: 'not-a-protocol' }).protocol.title, PROTOCOLS.other.title);
});
