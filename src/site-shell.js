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
    <div class="sidebar-brand-row"><a class="brand" href="index.html" aria-label="ORBITAL home"><span class="brand-mark"><span></span><span></span><span></span></span><span>ORBITAL<small>MISSION HEALTH</small></span></a><button class="sidebar-toggle" type="button" aria-label="Collapse navigation" title="Collapse navigation">‹</button></div>
    <div class="mission-chip"><span class="live-dot"></span><div><small>MISSION STATUS</small><strong>IN ORBIT · ACTIVE</strong></div></div>
    <nav class="nav-links" aria-label="Main navigation">${pages.map(([file, icon, title]) => `<a class="nav-link${current === file ? ' active' : ''}" href="${file}" title="${title}"${current === file ? ' aria-current="page"' : ''}><span class="nav-icon">${icon}</span><span class="nav-label">${title}</span><span class="nav-arrow">↗</span></a>`).join('')}</nav>
    <div class="sidebar-bottom"><a class="crew-card" href="health.html"><span class="crew-avatar">AC</span><span><strong>Alex Chen</strong><small>Mission specialist</small></span><span class="crew-online"></span></a><div class="sidebar-foot"><span>ORBITAL SYSTEMS <i>v1.0</i></span><span>BUILT TO EXPLORE <b>✦</b></span></div></div>`;

  const toggle = sidebar.querySelector('.sidebar-toggle');
  const shell = document.querySelector('.app-shell');
  let saved = false;
  try { saved = localStorage.getItem('orbital-nav-collapsed') === 'true'; } catch { /* Navigation still works without browser storage. */ }
  shell?.classList.toggle('sidebar-collapsed', saved);
  toggle.textContent = saved ? '›' : '‹';
  toggle.setAttribute('aria-label', saved ? 'Expand navigation' : 'Collapse navigation');
  if (matchMedia('(max-width: 720px)').matches) { toggle.textContent = '☰'; toggle.setAttribute('aria-label', 'Open navigation'); }
  toggle.addEventListener('click', () => {
    if (matchMedia('(max-width: 720px)').matches) {
      shell.classList.toggle('sidebar-open');
      const open = shell.classList.contains('sidebar-open');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      toggle.textContent = open ? '×' : '☰';
      return;
    }
    const collapsed = shell.classList.toggle('sidebar-collapsed');
    try { localStorage.setItem('orbital-nav-collapsed', String(collapsed)); } catch { /* Collapsing still works for this visit. */ }
    toggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
    toggle.textContent = collapsed ? '›' : '‹';
  });
}

const cosmic = document.createElement('div');
cosmic.className = 'cosmic-orbits';
cosmic.setAttribute('aria-hidden', 'true');
cosmic.innerHTML = '<span class="cosmic-orbit orbit-one"><i class="orbiting-planet planet-violet"></i></span><span class="cosmic-orbit orbit-two"><i class="orbiting-planet planet-cyan"></i></span><span class="cosmic-orbit orbit-three"><i class="orbiting-planet planet-rose"></i></span><span class="cosmic-moon"></span>';
document.body.append(cosmic);

document.addEventListener('keydown', (event) => {
  if ((event.altKey || event.metaKey) && event.key.toLowerCase() === 'm') {
    event.preventDefault();
    sidebar?.querySelector('.sidebar-toggle')?.click();
  }
});

