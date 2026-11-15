import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSpaceflightEvidence } from '../src/data/spaceflight-evidence.mjs';

test('retrieval ranks relevant official references and always returns attributed URLs', () => {
  const sources = selectSpaceflightEvidence('How is astronaut radiation dose tracked with dosimeters?');
  assert.equal(sources[0].id, 'csa-radiation');
  assert.ok(sources.every((source) => /^https:\/\//.test(source.url) && source.organization && source.note));
});

test('medical support questions retrieve NASA in-flight care while unrelated prompts add no citations', () => {
  assert.ok(selectSpaceflightEvidence('No flight surgeon is reachable, what support path should I use?').some((source) => source.id === 'nasa-medical-care'));
  assert.deepEqual(selectSpaceflightEvidence('What is 2 plus 2?'), []);
});
