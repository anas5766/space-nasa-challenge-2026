/** Return the latest valid observations in chronological order for charting. */
export function selectRecentHistory(history, metricId, limit = 12) {
  const max = Math.max(1, Math.floor(Number(limit) || 12));
  return (Array.isArray(history) ? history : [])
    .filter((entry) => entry && Number.isFinite(Date.parse(entry.at || entry.recordedAt || ''))
      && Number.isFinite(Number(entry.readings?.[metricId])))
    .slice()
    .sort((a, b) => Date.parse(a.at || a.recordedAt) - Date.parse(b.at || b.recordedAt))
    .slice(-max);
}
