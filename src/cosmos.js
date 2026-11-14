import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const TEXTURE_ROOT = 'https://cdn.solarsystemscope.com/textures/download/';
const TEXTURES = {
  galaxy: `${TEXTURE_ROOT}2k_stars_milky_way.jpg`,
  sun: `${TEXTURE_ROOT}2k_sun.jpg`,
  mercury: `${TEXTURE_ROOT}2k_mercury.jpg`,
  earth: `${TEXTURE_ROOT}2k_earth_daymap.jpg`,
  clouds: `${TEXTURE_ROOT}2k_earth_clouds.jpg`,
  moon: `${TEXTURE_ROOT}2k_moon.jpg`,
  mars: `${TEXTURE_ROOT}2k_mars.jpg`,
  jupiter: `${TEXTURE_ROOT}2k_jupiter.jpg`,
  saturn: `${TEXTURE_ROOT}2k_saturn.jpg`,
  rings: `${TEXTURE_ROOT}2k_saturn_ring_alpha.png`,
};

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 5, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,252,224,1)');
  gradient.addColorStop(0.12, 'rgba(255,218,150,.88)');
  gradient.addColorStop(0.3, 'rgba(255,162,84,.42)');
  gradient.addColorStop(0.58, 'rgba(255,116,65,.12)');
  gradient.addColorStop(1, 'rgba(255,116,65,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addStarPoints(scene) {
  const count = 1900;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color('#bfdfff'), new THREE.Color('#ffffff'), new THREE.Color('#ffe2bd')];
  for (let index = 0; index < count; index += 1) {
    const z = Math.random() * 2 - 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = 86 + Math.random() * 14;
    const planar = Math.sqrt(1 - z * z) * radius;
    positions[index * 3] = Math.cos(angle) * planar;
    positions[index * 3 + 1] = Math.sin(angle) * planar;
    positions[index * 3 + 2] = z * radius;
    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.13,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  scene.add(stars);
  return stars;
}

function textureLoader(loader, url, onLoad) {
  loader.load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    onLoad(texture);
  }, undefined, () => {});
}

export function mountCosmosScene(container) {
  const canvas = container.querySelector('.cosmic-webgl-canvas');
  if (!canvas || !window.WebGLRenderingContext) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    container.classList.add('cosmic-webgl-fallback');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x02050b, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
  camera.position.set(0, 0, 0);
  const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x060b13, side: THREE.BackSide, toneMapped: false });
  const galaxy = new THREE.Mesh(new THREE.SphereGeometry(115, 64, 48), backgroundMaterial);
  galaxy.frustumCulled = false;
  scene.add(galaxy);
  addStarPoints(scene);

  const ambient = new THREE.HemisphereLight(0x9ebfe8, 0x080c16, 0.16);
  scene.add(ambient);

  const depth = 36;
  const system = new THREE.Group();
  system.position.z = -depth;
  system.rotation.set(-0.64, 0.12, 0.18);
  scene.add(system);

  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffd18a,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  sunGlow.scale.set(12, 12, 1);
  system.add(sunGlow);

  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffc66d, toneMapped: false });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.55, 56, 40), sunMaterial);
  system.add(sun);
  const sunlight = new THREE.PointLight(0xffd9a0, 125, 150, 2);
  system.add(sunlight);

  const loader = new THREE.TextureLoader().setCrossOrigin('anonymous');
  textureLoader(loader, TEXTURES.galaxy, (texture) => {
    backgroundMaterial.map = texture;
    backgroundMaterial.color.set('#ffffff');
    backgroundMaterial.needsUpdate = true;
  });
  textureLoader(loader, TEXTURES.sun, (texture) => {
    sunMaterial.map = texture;
    sunMaterial.color.set('#fff5dd');
    sunMaterial.needsUpdate = true;
  });

  const planetSpecs = [
    { name: 'Mercury', texture: 'mercury', color: '#8e8881', radius: 0.27, orbit: 0.18, speed: 0.04 },
    { name: 'Earth', texture: 'earth', color: '#4d9ac7', radius: 0.73, orbit: 0.33, speed: 0.026 },
    { name: 'Mars', texture: 'mars', color: '#c97857', radius: 0.48, orbit: 0.48, speed: 0.018 },
    { name: 'Jupiter', texture: 'jupiter', color: '#c9a27f', radius: 1.02, orbit: 0.68, speed: 0.009 },
    { name: 'Saturn', texture: 'saturn', color: '#d3bd91', radius: 0.83, orbit: 0.88, speed: 0.006 },
  ];
  const orbitEntries = [];
  const orbitGeometry = new THREE.BufferGeometry();
  const orbitPoints = [];
  for (let index = 0; index <= 160; index += 1) {
    const angle = (index / 160) * Math.PI * 2;
    orbitPoints.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle) * 0.78, -0.035));
  }
  orbitGeometry.setFromPoints(orbitPoints);

  const orbitLimit = () => {
    const halfHeight = depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfWidth = halfHeight * camera.aspect;
    return Math.max(4.2, Math.min(halfHeight * 0.78, halfWidth * 0.86));
  };

  for (const [index, spec] of planetSpecs.entries()) {
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: index % 2 ? 0x9bdbea : 0xf4c989,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const orbitPath = new THREE.LineLoop(orbitGeometry, orbitMaterial);
    const pivot = new THREE.Group();
    const body = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: spec.color, roughness: spec.name === 'Earth' ? 0.72 : 0.9, metalness: 0.015 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(spec.radius, 48, 32), material);
    body.add(sphere);
    pivot.add(body);
    system.add(orbitPath, pivot);

    if (spec.name === 'Earth') {
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(spec.radius * 1.055, 48, 32),
        new THREE.MeshBasicMaterial({ color: 0x57aefa, side: THREE.BackSide, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      body.add(atmosphere);
      const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xd9f3ff, transparent: true, opacity: 0.28, depthWrite: false });
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(spec.radius * 1.016, 48, 32), cloudMaterial);
      body.add(clouds);
      textureLoader(loader, TEXTURES.clouds, (texture) => {
        cloudMaterial.alphaMap = texture;
        cloudMaterial.needsUpdate = true;
      });
      const moonOrbit = new THREE.Group();
      body.add(moonOrbit);
      const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xcac8c4, roughness: 1 });
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 18), moonMaterial);
      moon.position.x = 1.08;
      moonOrbit.add(moon);
      textureLoader(loader, TEXTURES.moon, (texture) => { moonMaterial.map = texture; moonMaterial.needsUpdate = true; });
      orbitEntries.push({ pivot: moonOrbit, speed: 0.09, body: moon, radius: 0, orbitPath: null, moon: true });
    }

    if (spec.name === 'Saturn') {
      const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xdcc896, transparent: true, opacity: 0.88, roughness: 0.95, side: THREE.DoubleSide, depthWrite: false });
      const rings = new THREE.Mesh(new THREE.RingGeometry(spec.radius * 1.32, spec.radius * 2.12, 96), ringMaterial);
      rings.rotation.x = 0.34;
      rings.rotation.z = -0.12;
      body.add(rings);
      textureLoader(loader, TEXTURES.rings, (texture) => {
        ringMaterial.map = texture;
        ringMaterial.alphaMap = texture;
        ringMaterial.needsUpdate = true;
      });
    }

    if (spec.texture) {
      textureLoader(loader, TEXTURES[spec.texture], (texture) => {
        material.map = texture;
        material.needsUpdate = true;
      });
    }
    orbitEntries.push({ pivot, body, sphere, orbitPath, radius: spec.orbit, speed: spec.speed, name: spec.name });
  }

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const orbitRadius = orbitLimit();
    for (const entry of orbitEntries) {
      if (entry.moon) continue;
      const radius = orbitRadius * entry.radius;
      entry.body.position.set(radius, 0, 0);
      entry.orbitPath.scale.set(radius, radius, 1);
    }
    const halfHeight = depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfWidth = halfHeight * camera.aspect;
    system.position.x = Math.min(halfWidth * 0.24, 4.5);
    system.position.y = halfHeight * 0.22;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let pointerX = 0;
  let pointerY = 0;
  const handlePointer = (event) => {
    if (event.pointerType === 'touch') return;
    pointerX = (event.clientX / window.innerWidth - 0.5) * 0.5;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 0.38;
  };
  window.addEventListener('pointermove', handlePointer, { passive: true });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animationId = 0;
  let previousTime = performance.now();
  function render(time) {
    animationId = requestAnimationFrame(render);
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    if (!reducedMotion.matches) {
      galaxy.rotation.y += delta * 0.00035;
      sun.rotation.y += delta * 0.045;
      system.rotation.y += delta * 0.0015;
      orbitEntries.forEach((entry) => {
        entry.pivot.rotation.z += delta * entry.speed;
        if (entry.moon) entry.body.rotation.y += delta * 0.08;
        else entry.body.rotation.y += delta * (entry.name === 'Earth' ? 0.22 : 0.12);
      });
      const pulse = Math.sin(time * 0.0011);
      sunlight.intensity = 118 + pulse * 10;
      sunGlow.material.opacity = 0.64 + pulse * 0.08;
      sunGlow.scale.setScalar(12 + pulse * 0.45);
    }
    camera.position.x += (pointerX - camera.position.x) * 0.018;
    camera.position.y += (pointerY - camera.position.y) * 0.018;
    camera.lookAt(0, 0, -depth);
    renderer.render(scene, camera);
  }
  container.classList.add('cosmic-webgl-ready');
  animationId = requestAnimationFrame(render);

  const cleanup = () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', handlePointer);
    renderer.dispose();
  };
  window.addEventListener('pagehide', cleanup, { once: true });
}
