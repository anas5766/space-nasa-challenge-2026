export function renderHealthPanel({ title, metrics }) {
  const panel = document.createElement('section');
  panel.className = 'panel';

  panel.innerHTML = `
    <h2>${title}</h2>
    <ul class="info-list">
      ${metrics
        .map(
          (metric) => `
            <li>
              <span>${metric.name}</span>
              <strong>${metric.healthyRange[0]}-${metric.healthyRange[1]} ${metric.unit}</strong>
            </li>
          `
        )
        .join('')}
    </ul>
  `;

  document.querySelector('.dashboard')?.appendChild(panel);
}
