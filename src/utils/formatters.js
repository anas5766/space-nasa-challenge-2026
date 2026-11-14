export function formatMetricValue(value, unit) {
  return `${value} ${unit}`;
}

export function formatRiskLabel(state) {
  const map = {
    normal: 'Stable',
    warning: 'Needs attention',
    critical: 'Critical',
  };

  return map[state] || 'Unknown';
}
