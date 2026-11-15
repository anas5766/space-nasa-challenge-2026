const current = location.pathname.split('/').pop() || 'index.html';
document.body.dataset.page = current.replace(/\.html?$/, '');
document.body.classList.add('planet-navigation-shell');
document.querySelector('.sidebar')?.remove();
document.querySelectorAll('.avatar-small').forEach((avatar) => avatar.remove());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});

if (current !== 'index.html') {
  const breadcrumb = document.querySelector('.topbar .breadcrumb');
  if (breadcrumb) {
    const sunRoute = document.createElement('a');
    sunRoute.className = 'solar-return';
    sunRoute.href = 'index.html';
    sunRoute.setAttribute('aria-label', 'Return to the solar system and choose a planet');
    sunRoute.innerHTML = '<span aria-hidden="true">☼</span><b>SOLAR SYSTEM</b>';
    breadcrumb.replaceChildren(sunRoute);
  }
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
if (document.body.classList.contains('solar-command-page')) {
  cosmic.remove();
} else {
  document.body.append(cosmic);
  import('./cosmos.js').then(({ mountCosmosScene }) => mountCosmosScene(cosmic)).catch(() => {
    cosmic.classList.add('cosmic-webgl-fallback');
  });
}

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
