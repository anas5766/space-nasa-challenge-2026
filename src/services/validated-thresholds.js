/**
 * Intentionally empty by default.
 * Add a numeric rule only after it has been reviewed for the mission population,
 * measurement method, unit, and clinical context by an authorized medical team.
 * `validated: true` is an attestation, not something this prototype can verify.
 * Required shape:
 * {
 *   metricId: 'heartRate', unit: 'bpm', direction: 'above', value: 100,
 *   level: 'attention', validated: true,
 *   source: { name: 'Approved mission protocol, revision X', url: 'https://...' }
 * }
 */
export const VALIDATED_THRESHOLDS = Object.freeze([]);
