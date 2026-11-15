const CACHE='valmed-health-assessment-v11';
const CORE=[
  '/index.html','/health.html','/anatomy.html',
  '/src/styles.css','/src/presentation.css','/src/visual-polish.css','/src/solar-command.css',
  '/src/site-shell.js','/src/page-clock.js','/src/solar-command.js','/src/solar-scene.js',
  '/src/data/solar-navigation.mjs','/src/data/orbital-motion.mjs','/assets/vendor/three/three.module.js','/assets/vendor/three/three.core.js','/assets/vendor/three/examples/jsm/loaders/GLTFLoader.js','/assets/solar-models/hyg-stars.csv',
  '/assets/solar-textures/2k_sun.jpg','/assets/solar-textures/2k_mercury.jpg','/assets/solar-textures/2k_venus_surface.jpg',
  '/assets/solar-textures/2k_earth_daymap.jpg','/assets/solar-textures/2k_earth_clouds.jpg','/assets/solar-textures/2k_moon.jpg','/assets/solar-textures/2k_mars.jpg',
  '/assets/solar-textures/2k_jupiter.jpg','/assets/solar-textures/2k_saturn.jpg','/assets/solar-textures/2k_saturn_ring_alpha.png',
  '/assets/solar-textures/2k_uranus.jpg','/assets/solar-textures/2k_neptune.jpg','/assets/solar-textures/2k_stars_milky_way.jpg',
  '/src/protocols/protocols.css','/src/health-page.js','/src/anatomy.js','/src/anatomy-health-map.mjs','/src/anatomy-callout.css',
  '/src/data/demo-mission.mjs','/src/data/health-history.mjs','/src/health-state.js','/src/protocols/protocol-ui.js',
  '/src/protocols/protocol-engine.mjs','/src/services/health-risk-engine.mjs','/src/services/validated-thresholds.js','/src/services/health-risk-ui.css'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('valmed-protocol-offline-')||k.startsWith('valmed-health-assessment-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(r,copy))}return response}).catch(()=>r.mode==='navigate'?caches.match('/health.html'):Response.error())))});
