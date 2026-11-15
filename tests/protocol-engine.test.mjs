import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNoMedicalSupportResponse, evaluateProtocol, PROTOCOLS, reportsMedicalSupportUnavailable } from '../src/protocols/protocol-engine.mjs';

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

test('recognizes when the astronaut cannot contact medical support', () => {
  assert.equal(reportsMedicalSupportUnavailable('There is no medical crew, help me'), true);
  assert.equal(reportsMedicalSupportUnavailable('No puedo contactar con el equipo médico'), true);
  assert.equal(reportsMedicalSupportUnavailable('The doctor is available now'), false);
});

test('remembers unavailable medical support across follow-up messages', () => {
  assert.equal(reportsMedicalSupportUnavailable('I am alone and getting worse', [
    { role: 'user', content: 'There is no medical crew, help me' },
  ]), true);
});

test('support-unavailable reply gives concrete safe actions without replacing escalation', () => {
  const response = buildNoMedicalSupportResponse({ protocolTitle: 'Chest discomfort', symptom: 'chest' });
  assert.match(response, /approved primary and backup channels/i);
  assert.match(response, /mission-approved emergency medical checklist/i);
  assert.match(response, /Do not guess a medication or dose/i);
  assert.match(response, /Are you alone/i);
  const aloneResponse = buildNoMedicalSupportResponse({ protocolTitle: 'Chest discomfort', symptom: 'chest', question: 'I am alone' });
  assert.match(aloneResponse, /Do not spend time searching/i);
  assert.match(aloneResponse, /trouble breathing/i);
});
