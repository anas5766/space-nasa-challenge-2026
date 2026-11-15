import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLAR_BODIES, solarBodyById } from '../src/data/solar-navigation.mjs';
import { createEllipticalOrbitPoints, MOON_ECCENTRICITY, MOON_ORBITAL_INCLINATION, MOON_VISUAL_ORBIT_RADIUS, MOON_VISUAL_RADIUS, pointOnOrbit } from '../src/data/orbital-motion.mjs';

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

test('every planet stays on its visible Kepler ellipse at every orbital phase', () => {
  for (const body of SOLAR_BODIES.filter(({ orbit }) => orbit > 0)) {
    const minorScale = Math.sqrt(1 - body.eccentricity ** 2);
    const inclination = body.inclination * Math.PI / 180;
    const localZ = (point) => -point.y * Math.sin(inclination) + point.z * Math.cos(inclination);
    const orbitPoints = createEllipticalOrbitPoints(body.eccentricity, 220, body.inclination);
    assert.ok(orbitPoints.every((point) => Math.abs((point.x + body.eccentricity) ** 2 + (localZ(point) / minorScale) ** 2 - 1) < 1e-12));
    for (const phase of [0, Math.PI / 4, Math.PI / 2, Math.PI, Math.PI * 1.75]) {
      const position = pointOnOrbit(body.orbit, body.eccentricity, phase, body.inclination);
      const ellipseValue = ((position.x / body.orbit) + body.eccentricity) ** 2 + (localZ(position) / (body.orbit * minorScale)) ** 2;
      assert.ok(Math.abs(ellipseValue - 1) < 1e-12, `${body.name} remains on its ${body.orbit} orbit`);
    }
  }
});

test('Moon has a smaller body and a separate orbit around Earth', () => {
  assert.ok(MOON_VISUAL_RADIUS < solarBodyById('earth').radius);
  const inclination = MOON_ORBITAL_INCLINATION * Math.PI / 180;
  const moonPosition = pointOnOrbit(MOON_VISUAL_ORBIT_RADIUS, MOON_ECCENTRICITY, Math.PI / 3, MOON_ORBITAL_INCLINATION);
  const minorScale = Math.sqrt(1 - MOON_ECCENTRICITY ** 2);
  const moonLocalZ = -moonPosition.y * Math.sin(inclination) + moonPosition.z * Math.cos(inclination);
  const ellipseValue = ((moonPosition.x / MOON_VISUAL_ORBIT_RADIUS) + MOON_ECCENTRICITY) ** 2 + (moonLocalZ / (MOON_VISUAL_ORBIT_RADIUS * minorScale)) ** 2;
  assert.ok(Math.abs(ellipseValue - 1) < 1e-12);
});
