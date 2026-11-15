import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLAR_BODIES, solarBodyById } from '../src/data/solar-navigation.mjs';

test('solar navigation includes the Sun and all eight planets with working VALMED destinations', () => {
  assert.deepEqual(SOLAR_BODIES.map(({ id }) => id), ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
  for (const body of SOLAR_BODIES) {
    assert.ok(body.feature && body.description && body.action, `${body.id} needs meaningful navigation copy`);
    assert.match(body.href, /^(#missionTelemetry|health\.html(?:#healthLog|#healthChart)?|hazards\.html|anatomy\.html|assistant\.html|training\.html)$/);
  }
  assert.equal(solarBodyById('mars').href, 'hazards.html');
  assert.equal(solarBodyById('sun').href, '#missionTelemetry');
  assert.equal(solarBodyById('missing').id, 'sun');
});

test('orbit distances are visually compressed and are not presented as real scale', () => {
  const planets = SOLAR_BODIES.filter(({ orbit }) => orbit > 0);
  assert.equal(planets.length, 8);
  assert.ok(planets.every((body) => body.orbit <= 11));
  assert.deepEqual(planets.map(({ orbit }) => orbit), [...planets.map(({ orbit }) => orbit)].sort((a, b) => a - b));
});
