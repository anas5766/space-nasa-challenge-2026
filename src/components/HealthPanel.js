export function renderHealthPanel({ title, metrics }) {
  const panel = document.createElement('section');
  panel.className = 'panel';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const list = document.createElement('ul');
  list.className = 'info-list';
  for (const metric of metrics) {
    const row = document.createElement('li');
    const label = document.createElement('span');
    const value = document.createElement('strong');
    label.textContent = metric.name;
    value.textContent = metric.value === null || metric.value === undefined
      ? 'NOT RECORDED'
      : `${metric.value} ${metric.unit} · ${metric.status || 'UNKNOWN'}`;
    row.append(label, value);
    list.append(row);
  }
  panel.append(heading, list);
  document.querySelector('.dashboard')?.appendChild(panel);
}
