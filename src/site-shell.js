const pages = [
  ['index.html', '◫', 'Mission overview'],
  ['health.html', '⌁', 'Health metrics'],
  ['hazards.html', '☼', 'Spaceflight hazards'],
  ['anatomy.html', '◎', '3D anatomy'],
  ['assistant.html', '✳', 'Local AI assistant'],
  ['training.html', '✦', 'Wellness training'],
];

const sidebar = document.querySelector('.sidebar');
if (sidebar) {
  const current = location.pathname.split('/').pop() || 'index.html';
  sidebar.innerHTML = `
    <div class="sidebar-brand-row"><a class="brand" href="index.html" aria-label="Valmed home"><span class="brand-mark"><span></span><span></span><span></span></span><span>Valmed<small>MISSION HEALTH</small></span></a><button class="sidebar-toggle" type="button" aria-label="Collapse navigation" aria-controls="primary-navigation" aria-expanded="true" title="Collapse navigation">‹</button></div>
    <div class="mission-chip"><span class="live-dot"></span><div><small>WORKSPACE</small><strong>LOCAL PROTOTYPE</strong></div></div>
    <nav class="nav-links" id="primary-navigation" aria-label="Main navigation">${pages.map(([file, icon, title]) => `<a class="nav-link${current === file ? ' active' : ''}" href="${file}" title="${title}"${current === file ? ' aria-current="page"' : ''}><span class="nav-icon">${icon}</span><span class="nav-label">${title}</span><span class="nav-arrow">↗</span></a>`).join('')}</nav>
    <div class="sidebar-bottom"><a class="crew-card" href="health.html"><span class="crew-avatar">AC</span><span><strong>Alex Chen</strong><small>Mission specialist</small></span><span class="crew-online"></span></a><div class="sidebar-foot"><span>Valmed SYSTEMS <i>v1.0</i></span><span>BUILT TO EXPLORE <b>✦</b></span></div></div>`;

  const toggle = sidebar.querySelector('.sidebar-toggle');
  const shell = document.querySelector('.app-shell');
  let saved = false;
  try { saved = localStorage.getItem('orbital-nav-collapsed') === 'true'; } catch { /* Navigation still works without browser storage. */ }
  shell?.classList.toggle('sidebar-collapsed', saved);
  toggle.textContent = saved ? '›' : '‹';
  toggle.setAttribute('aria-label', saved ? 'Expand navigation' : 'Collapse navigation');
  toggle.setAttribute('aria-expanded', String(!saved));
  const mobile = matchMedia('(max-width: 720px)');
  if (mobile.matches) { toggle.textContent = '☰'; toggle.setAttribute('aria-label', 'Open navigation'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', () => {
    if (mobile.matches) {
      shell.classList.toggle('sidebar-open');
      const open = shell.classList.contains('sidebar-open');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '×' : '☰';
      return;
    }
    const collapsed = shell.classList.toggle('sidebar-collapsed');
    try { localStorage.setItem('orbital-nav-collapsed', String(collapsed)); } catch { /* Collapsing still works for this visit. */ }
    toggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? '›' : '‹';
  });
  mobile.addEventListener('change', (event) => {
    shell?.classList.remove('sidebar-open');
    toggle.textContent = event.matches ? '☰' : (shell?.classList.contains('sidebar-collapsed') ? '›' : '‹');
    toggle.setAttribute('aria-label', event.matches ? 'Open navigation' : (shell?.classList.contains('sidebar-collapsed') ? 'Expand navigation' : 'Collapse navigation'));
    toggle.setAttribute('aria-expanded', String(!event.matches && !shell?.classList.contains('sidebar-collapsed')));
  });
  document.addEventListener('click', (event) => {
    if (mobile.matches && shell?.classList.contains('sidebar-open') && !sidebar.contains(event.target)) {
      shell.classList.remove('sidebar-open'); toggle.textContent = '☰'; toggle.setAttribute('aria-label', 'Open navigation'); toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobile.matches && shell?.classList.contains('sidebar-open')) {
      shell.classList.remove('sidebar-open'); toggle.focus(); toggle.textContent = '☰'; toggle.setAttribute('aria-label', 'Open navigation'); toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

const cosmic = document.createElement('div');
cosmic.className = 'cosmic-orbits';
cosmic.setAttribute('aria-hidden', 'true');
cosmic.innerHTML = `
  <canvas class="cosmic-webgl-canvas" aria-hidden="true"></canvas>
  <span class="cosmic-orbit orbit-one"><i class="orbiting-planet planet-blue"></i></span>
  <span class="cosmic-orbit orbit-two"><i class="orbiting-planet planet-cyan"></i></span>
  <span class="cosmic-orbit orbit-three"><i class="orbiting-planet planet-rose"></i></span>
  <span class="cosmic-aurora aurora-one"></span><span class="cosmic-aurora aurora-two"></span>
  <span class="cosmic-galaxy galaxy-one"><i></i><b></b></span>
  <span class="cosmic-dust dust-one"></span><span class="cosmic-dust dust-two"></span>
  <span class="cosmic-planet earth-world" aria-hidden="true"><i class="planet-map"></i><b class="planet-clouds"></b><em></em></span>
  <span class="cosmic-planet saturn-world" aria-hidden="true"><i class="saturn-rings"></i><b class="saturn-bands"></b></span>
  <span class="cosmic-planet mars-world" aria-hidden="true"><i class="mars-craters"></i></span>
  <span class="cosmic-sun" aria-hidden="true"><i class="sun-core"></i><b class="sun-corona"></b><em class="sun-orbit"></em></span>
  <span class="cosmic-moon"></span>
  <span class="cosmic-comet comet-one"></span><span class="cosmic-comet comet-two"></span><span class="cosmic-comet comet-three"></span><span class="cosmic-comet comet-four"></span>
  <span class="cosmic-satellite"><i></i><b></b></span>
  <span class="cosmic-asteroid asteroid-one"></span><span class="cosmic-asteroid asteroid-two"></span>
  <span class="cosmic-glow glow-one"></span><span class="cosmic-glow glow-two"></span>
  <span class="cosmic-constellation constellation-one"><i></i><i></i><i></i><i></i></span>
  <span class="cosmic-constellation constellation-two"><i></i><i></i><i></i><i></i></span>
  <span class="cosmic-scan-arc arc-one"></span><span class="cosmic-scan-arc arc-two"></span>
`;
document.body.append(cosmic);

import('./cosmos.js').then(({ mountCosmosScene }) => mountCosmosScene(cosmic)).catch(() => {
  cosmic.classList.add('cosmic-webgl-fallback');
});

document.querySelectorAll('.page-footer').forEach((footer) => {
  const credit = document.createElement('a');
  credit.className = 'cosmic-credit';
  credit.href = 'https://cdn.solarsystemscope.com/textures/';
  credit.target = '_blank';
  credit.rel = 'noopener';
  credit.textContent = 'SPACE TEXTURES · SOLAR SYSTEM SCOPE (CC BY 4.0)';
  footer.append(credit);
});

let pointerFrame = 0;
window.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = requestAnimationFrame(() => {
    const x = ((event.clientX / window.innerWidth) - 0.5) * 10;
    const y = ((event.clientY / window.innerHeight) - 0.5) * 10;
    cosmic.style.setProperty('--parallax-x', `${x.toFixed(1)}px`);
    cosmic.style.setProperty('--parallax-y', `${y.toFixed(1)}px`);
    cosmic.style.setProperty('--cursor-x', `${event.clientX}px`);
    cosmic.style.setProperty('--cursor-y', `${event.clientY}px`);
    document.documentElement.style.setProperty('--pointer-x', `${(event.clientX / window.innerWidth - .5).toFixed(3)}`);
    document.documentElement.style.setProperty('--pointer-y', `${(event.clientY / window.innerHeight - .5).toFixed(3)}`);
    document.documentElement.style.setProperty('--hero-parallax-x', `${(-x * .45).toFixed(1)}px`);
    document.documentElement.style.setProperty('--hero-parallax-y', `${(-y * .45).toFixed(1)}px`);
  });
}, { passive: true });

const tiltTargets = '.metric-card,.mission-card,.resource-card,.hazard-card,.game-card,.assistant-setup';
document.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card = event.target.closest(tiltTargets);
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  card.style.setProperty('--hover-x', `${(x * 100).toFixed(1)}%`);
  card.style.setProperty('--hover-y', `${(y * 100).toFixed(1)}%`);
  card.style.setProperty('--tilt-x', `${((.5 - y) * 2.2).toFixed(2)}deg`);
  card.style.setProperty('--tilt-y', `${((x - .5) * 2.2).toFixed(2)}deg`);
}, { passive: true });
document.addEventListener('pointerout', (event) => {
  const card = event.target.closest?.(tiltTargets);
  if (card && !card.contains(event.relatedTarget)) {
    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
    card.style.removeProperty('--hover-x');
    card.style.removeProperty('--hover-y');
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.altKey || event.metaKey) && event.key.toLowerCase() === 'm') {
    event.preventDefault();
    sidebar?.querySelector('.sidebar-toggle')?.click();
  }
});

