export const MOON_VISUAL_ORBIT_RADIUS = 0.92;
export const MOON_VISUAL_RADIUS = 0.115;
export const MOON_INITIAL_PHASE = 0.75;
export const MOON_ORBITAL_SPEED = 0.12;
export const MOON_ECCENTRICITY = 0.055;
export const MOON_ORBITAL_INCLINATION = 5.145;

function tiltToEcliptic(x, z, inclinationDegrees) {
  const inclination = inclinationDegrees * Math.PI / 180;
  return { x, y: -z * Math.sin(inclination), z: z * Math.cos(inclination) };
}

export function pointOnOrbit(semiMajorAxis, eccentricity, meanAnomaly, inclinationDegrees = 0) {
  const mean = meanAnomaly % (Math.PI * 2);
  let eccentricAnomaly = mean + eccentricity * Math.sin(mean);
  for (let i = 0; i < 7; i += 1) {
    eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - mean)
      / (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  const minorScale = Math.sqrt(1 - eccentricity * eccentricity);
  return tiltToEcliptic(
    semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity),
    -semiMajorAxis * minorScale * Math.sin(eccentricAnomaly),
    inclinationDegrees,
  );
}

export function createEllipticalOrbitPoints(eccentricity = 0, segments = 220, inclinationDegrees = 0) {
  const minorScale = Math.sqrt(1 - eccentricity * eccentricity);
  return Array.from({ length: segments }, (_, index) => {
    const eccentricAnomaly = (index / segments) * Math.PI * 2;
    return tiltToEcliptic(Math.cos(eccentricAnomaly) - eccentricity, -minorScale * Math.sin(eccentricAnomaly), inclinationDegrees);
  });
}
