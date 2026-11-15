import { METRIC_DEFINITIONS } from '../health-state.js';

export const HEALTH_METRICS = METRIC_DEFINITIONS;
export const BODY_ZONES = ['Head', 'Cardio', 'Lungs', 'Muscle', 'Bone', 'Skin'].map((label) => ({ label, status: 'unknown' }));
