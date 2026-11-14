export function evaluateMetric(metric) {
  const [low, high] = metric.healthyRange;
  const value = Number(metric.value);

  if (value < low) {
    return {
      state: 'warning',
      message: `Low value detected. Review the metric and consider monitoring.`,
    };
  }

  if (value > high) {
    return {
      state: 'critical',
      message: `High value detected. This may require immediate attention.`,
    };
  }

  return {
    state: 'normal',
    message: 'Within healthy range. Continue routine monitoring.',
  };
}

export function generateHealthSummary(metrics) {
  const results = metrics.map((metric) => ({
    label: metric.name,
    value: `${metric.value} ${metric.unit}`,
    state: evaluateMetric(metric).state,
  }));

  return results;
}
