export const HEALTH_METRICS = [
  {
    id: 'heart-rate',
    name: 'Heart Rate',
    unit: 'bpm',
    healthyRange: [60, 90],
    importance: 'cardio'
  },
  {
    id: 'blood-sugar',
    name: 'Blood Sugar',
    unit: 'mg/dL',
    healthyRange: [70, 140],
    importance: 'metabolism'
  },
  {
    id: 'hydration',
    name: 'Hydration',
    unit: '%',
    healthyRange: [65, 100],
    importance: 'fluid-balance'
  },
  {
    id: 'sleep',
    name: 'Sleep Duration',
    unit: 'hrs',
    healthyRange: [7, 9],
    importance: 'recovery'
  }
];

export const BODY_ZONES = [
  { label: 'Head', status: 'normal' },
  { label: 'Cardio', status: 'warning' },
  { label: 'Lungs', status: 'normal' },
  { label: 'Muscle', status: 'warning' },
  { label: 'Bone', status: 'normal' },
  { label: 'Skin', status: 'normal' }
];
