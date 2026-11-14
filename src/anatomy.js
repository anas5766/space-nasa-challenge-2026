import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const MODELS = {
  male: 'https://cdn.jsdelivr.net/npm/open-anatomy-3d@0.1.0/models/anatomy-male.glb',
  female: 'https://cdn.jsdelivr.net/npm/open-anatomy-3d@0.1.0/models/anatomy-female.glb',
};
const COLORS = { normal: '#32d69a', warning: '#f1d35a', moderate: '#ff963f', critical: '#fb5563' };
const STRUCTURE_GROUPS = new Set(['skin', 'skeleton', 'muscles', 'organs', 'vessels', 'nerves', 'lymphatics', 'fascia', 'cartilage', 'ligaments']);
export function mountAnatomyViewer(container, { onSelect = () => {} } = {}) {
  const canvas = container.querySelector('#anatomyCanvas');
  const status = container.querySelector('#anatomyStatus');
  const details = container.querySelector('#anatomySelection');
  if (!canvas) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101522');
  scene.fog = new THREE.Fog('#101522', 5, 12);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
  camera.position.set(0, 1.05, 3.8);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1.6;
  controls.maxDistance = 7;
  controls.target.set(0, 0.9, 0);
  controls.maxPolarAngle = Math.PI * 0.92;
  scene.add(new THREE.HemisphereLight(0xdce7ff, 0x242033, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffead9, 3.0);
  keyLight.position.set(2.5, 4.5, 3.5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x818cff, 1.9);
  fillLight.position.set(-3, 2.5, -2);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0x6ce3dc, 1.8, 7);
  rimLight.position.set(0, 1.6, -2);
  scene.add(rimLight);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: '#252940', transparent: true, opacity: 0.52 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  floor.scale.set(0.7, 0.7, 0.7);
  scene.add(floor);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const originalMaterials = new WeakMap();
  let modelRoot = null;
  let selected = null;
  let currentSex = 'male';
  let healthMap = window.ORBITAL_HEALTH || {};
  let frameId;

  function sizeRenderer() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(sizeRenderer);
  resizeObserver.observe(canvas);
  sizeRenderer();

  function keyFor(object) {
    let current = object;
    while (current && current !== modelRoot) {
      if (current.name && !STRUCTURE_GROUPS.has(current.name.toLowerCase())) return current.name;
      current = current.parent;
    }
    return object?.name || 'Anatomical structure';
  }
  function labelFor(key) {
    return key.replace(/_(l|r)$/i, (part) => part.toLowerCase() === '_l' ? ' · left' : ' · right')
      .replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  function riskFor(key) {
    const name = key.toLowerCase();
    const buckets = [];
    if (/heart|aorta|arter|vein|cardiac/.test(name)) buckets.push('heartRate', 'bloodPressure');
    if (/kidney|renal|bladder|ureter/.test(name)) buckets.push('hydration');
    if (/brain|eye|optic|nerve/.test(name)) buckets.push('sleep', 'mood', 'vision');
    if (/muscle|psoas|quadricep|hamstring|glute/.test(name)) buckets.push('sleep', 'muscleStatus');
    if (/bone|femur|tibia|fibula|vertebra|spine|rib|humerus|ulna|radius|pelvis|patella|clavicle|scapula/.test(name)) buckets.push('boneStatus');
    if (/liver|stomach|pancrea|intestin|spleen/.test(name)) buckets.push('bloodSugar');
    if (/lung|bronch|trachea/.test(name)) buckets.push('oxygen');
    if (/skin|epiderm/.test(name)) buckets.push('temperature');
    const levels = { normal: 0, warning: 1, moderate: 2, critical: 3 };
    const scores = buckets.map((bucket) => healthMap[bucket]).filter(Boolean);
    if (/brain|eye|optic/.test(name)) scores.push(healthMap.bodyRegions?.head);
    if (/heart|lung|rib|aorta|arter/.test(name)) scores.push(healthMap.bodyRegions?.chest);
    if (/kidney|liver|stomach|pancrea|intestin|bladder/.test(name)) scores.push(healthMap.bodyRegions?.abdomen);
    if (/spine|vertebra/.test(name)) scores.push(healthMap.bodyRegions?.back);
    if (/humerus|ulna|radius|biceps|triceps|forearm|carpal/.test(name)) scores.push(healthMap.bodyRegions?.arm);
    if (/femur|tibia|fibula|quadricep|hamstring|glute|patella|tarsal/.test(name)) scores.push(healthMap.bodyRegions?.leg);
    const urgentRegions = healthMap.urgentRegions || [];
    if (urgentRegions.includes('chest') && /heart|lung|rib|aorta|arter|vein/.test(name)) scores.push('critical');
    if (urgentRegions.includes('head') && /brain|eye|optic/.test(name)) scores.push('critical');
    if (urgentRegions.includes('abdomen') && /kidney|liver|stomach|pancrea|intestin|bladder/.test(name)) scores.push('critical');
    if (urgentRegions.includes('back') && /spine|vertebra/.test(name)) scores.push('critical');
    if (urgentRegions.includes('arm') && /humerus|ulna|radius|biceps|triceps|forearm|carpal/.test(name)) scores.push('critical');
    if (urgentRegions.includes('leg') && /femur|tibia|fibula|quadricep|hamstring|glute|patella|tarsal/.test(name)) scores.push('critical');
    return scores.filter(Boolean).sort((a, b) => levels[b] - levels[a])[0] || 'normal';
  }
  function linkedStructure(key) {
    return /heart|aorta|arter|vein|cardiac|kidney|renal|bladder|ureter|brain|eye|optic|nerve|muscle|psoas|quadricep|hamstring|glute|bone|femur|tibia|fibula|vertebra|spine|rib|humerus|ulna|radius|pelvis|patella|clavicle|scapula|liver|stomach|pancrea|intestin|spleen|lung|bronch|trachea|skin|epiderm/.test(key.toLowerCase());
  }
  function preserveMaterials(root) {
    root.traverse((object) => {
      if (!object.isMesh) return;
      const original = Array.isArray(object.material) ? object.material.map((material) => material.clone()) : object.material.clone();
      originalMaterials.set(object, original);
      object.material = Array.isArray(original) ? original.map((material) => material.clone()) : original.clone();
      object.castShadow = true;
      object.receiveShadow = true;
    });
  }
  function applyColors() {
    if (!modelRoot) return;
    modelRoot.traverse((object) => {
      if (!object.isMesh) return;
      const key = keyFor(object);
      const level = riskFor(key);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const originals = originalMaterials.get(object);
      const originalList = Array.isArray(originals) ? originals : [originals];
      materials.forEach((material, index) => {
        const base = originalList[index] || originalList[0];
        if (level === 'normal' && !linkedStructure(key)) {
          material.color.copy(base.color);
          if (material.emissive) material.emissive.set('#000000');
          return;
        }
        const statusColor = new THREE.Color(COLORS[level] || COLORS.normal);
        if (material.color) material.color.copy(statusColor).lerp(base.color, 0.34);
        if (material.emissive) material.emissive.copy(statusColor);
        if ('emissiveIntensity' in material) material.emissiveIntensity = 0.38;
      });
    });
  }
  function showSelection(key) {
    selected = key;
    const level = riskFor(key);
    const label = labelFor(key);
    const safeLabel = label.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    const stateLabels = { normal: 'STABLE', warning: 'ATTENTION', moderate: 'MODERATE ALERT', critical: 'HIGH ALERT' };
    details.innerHTML = `<span class="anatomy-risk ${level}"><i></i>${stateLabels[level]}</span><strong>${safeLabel}</strong><small>${level === 'normal' ? 'No associated signals in the current readings.' : 'Color linked to a health indicator outside its reference range.'}</small>`;
    onSelect({ key, label, level });
  }
  function loadModel(sex = currentSex) {
    currentSex = sex;
    status.classList.remove('load-error');
    status.textContent = 'Loading 3D anatomy model…';
    loader.load(MODELS[sex], (gltf) => {
      if (modelRoot) scene.remove(modelRoot);
      modelRoot = gltf.scene;
      preserveMaterials(modelRoot);
      const skinButton = container.querySelector('[data-layer="skin"]');
      if (skinButton) skinButton.classList.remove('active');
      modelRoot.traverse((object) => { if (object.name?.toLowerCase() === 'skin') object.visible = false; });
      const box = new THREE.Box3().setFromObject(modelRoot);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      modelRoot.position.sub(center);
      modelRoot.position.y += size.y / 2;
      const scale = 1.78 / Math.max(size.y, 0.001);
      modelRoot.scale.setScalar(scale);
      scene.add(modelRoot);
      controls.target.set(0, 0.88, 0);
      camera.position.set(0, 1.0, 3.8);
      controls.update();
      applyColors();
      status.textContent = 'Drag to rotate · scroll or pinch to zoom';
      container.querySelector('.anatomy-load').hidden = true;
      showSelection('heart');
    }, (event) => {
      if (event.total) status.textContent = `Loading anatomy · ${Math.min(99, Math.round(event.loaded / event.total * 100))}%`;
    }, () => {
      status.textContent = 'Could not load the model. Check your connection and try again.';
      status.classList.add('load-error');
      container.querySelector('.anatomy-load').hidden = false;
    });
  }

  function animate() {
    frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    if (!modelRoot) return;
    raycaster.setFromCamera(pointer, camera);
    canvas.style.cursor = raycaster.intersectObject(modelRoot, true).length ? 'pointer' : 'grab';
  });
  canvas.addEventListener('click', (event) => {
    if (!modelRoot) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(modelRoot, true)[0];
    if (hit?.object) showSelection(keyFor(hit.object));
  });
  container.querySelectorAll('[data-layer]').forEach((button) => button.addEventListener('click', () => {
    const layer = button.dataset.layer;
    button.classList.toggle('active');
    const enabled = button.classList.contains('active');
    modelRoot?.children.forEach((group) => {
      if (group.name.toLowerCase() === layer) group.visible = enabled;
    });
  }));
  container.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    const view = button.dataset.view;
    container.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
    const sign = view === 'posterior' ? -1 : 1;
    camera.position.set(view === 'lateral' ? 3.8 : 0, 1.05, view === 'lateral' ? 0 : sign * 3.8);
    controls.target.set(0, 0.88, 0);
    controls.update();
  }));
  container.querySelector('#anatomySex')?.addEventListener('change', (event) => loadModel(event.target.value));
  container.querySelector('#anatomyRetry')?.addEventListener('click', () => loadModel(currentSex));
  container.querySelector('#anatomyReset')?.addEventListener('click', () => {
    camera.position.set(0, 1.05, 3.8);
    controls.target.set(0, 0.88, 0);
    controls.update();
  });
  window.addEventListener('orbital:health-update', (event) => {
    healthMap = event.detail || {};
    applyColors();
    if (selected) showSelection(selected);
  });
  loadModel();

  return () => {
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
  };
}

