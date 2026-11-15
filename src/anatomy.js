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
const PRIORITY_SYMPTOMS = new Set(['chest', 'breathing', 'fainting', 'confusion', 'weakness', 'rapid-worsening']);
const PRIVATE_STRUCTURE = /genital|penis|scrot|testis|testicle|vulva|vagin|clitoris|labia|perineum/i;
const LAYER_OPACITY = { skeleton: 0.58, muscles: 0.34, organs: 0.74, vessels: 0.62, nerves: 0.72, lymphatics: 0.66, fascia: 0.32, cartilage: 0.58, ligaments: 0.48 };
export function mountAnatomyViewer(container, { onSelect = () => {} } = {}) {
  const canvas = container.querySelector('#anatomyCanvas');
  const status = container.querySelector('#anatomyStatus');
  const details = container.querySelector('#anatomySelection');
  const directoryList = container.querySelector('#anatomyDirectoryList');
  const directoryCount = container.querySelector('#anatomyDirectoryCount');
  const searchInput = container.querySelector('#anatomySearch');
  const flaggedOnlyButton = container.querySelector('#anatomyFlaggedOnly');
  const flaggedCount = container.querySelector('#anatomyFlaggedCount');
  const calloutLayer = container.querySelector('#anatomyCalloutLayer');
  const calloutCard = container.querySelector('#anatomyCalloutCard');
  const calloutLine = container.querySelector('#anatomyCalloutLine');
  const calloutAnchor = container.querySelector('#anatomyCalloutAnchor');
  const calloutStatus = container.querySelector('#anatomyCalloutStatus');
  const calloutName = container.querySelector('#anatomyCalloutName');
  const calloutProblem = container.querySelector('#anatomyCalloutProblem');
  if (!canvas) return;

  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.Fog('#061827', 5.5, 13);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
  camera.position.set(0, 1.05, 3.8);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  controls.minDistance = 1.6;
  controls.maxDistance = 7;
  controls.target.set(0, 0.9, 0);
  controls.maxPolarAngle = Math.PI * 0.92;
  scene.add(new THREE.HemisphereLight(0xdce7ff, 0x242033, 2.1));
  const keyLight = new THREE.DirectionalLight(0xc8f2ff, 2.8);
  keyLight.position.set(2.5, 4.5, 3.5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x4b9cca, 1.55);
  fillLight.position.set(-3, 2.5, -2);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0x54f0df, 2.2, 7);
  rimLight.position.set(0, 1.6, -2);
  scene.add(rimLight);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: '#0b3150', transparent: true, opacity: 0.3, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  floor.scale.set(0.7, 0.7, 0.7);
  scene.add(floor);
  const scannerGrid = new THREE.GridHelper(2.5, 28, 0x41d7e7, 0x1c7597);
  scannerGrid.position.y = -0.018;
  scannerGrid.material.transparent = true;
  scannerGrid.material.opacity = 0.14;
  scannerGrid.material.depthWrite = false;
  scene.add(scannerGrid);
  const scannerPlatform = new THREE.Group();
  [0.5, 0.67, 0.84].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 1 ? 0.006 : 0.003, 8, 128),
      new THREE.MeshBasicMaterial({ color: index === 1 ? '#69f1e5' : '#42b8e6', transparent: true, opacity: index === 1 ? 0.4 : 0.2, depthWrite: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.scale.y = 0.42;
    ring.position.y = 0.005 + index * 0.007;
    scannerPlatform.add(ring);
  });
  scene.add(scannerPlatform);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const originalMaterials = new WeakMap();
  let modelRoot = null;
  let selected = null;
  let selectedAnchorWorld = null;
  let structureIndex = new Map();
  let flaggedOnly = false;
  let currentSex = 'male';
  let healthMap = window.Valmed_HEALTH || {};
  const layerSettings = new Map([...STRUCTURE_GROUPS].map((layer) => [layer, layer !== 'skin']));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoRotateActive = !reducedMotion;
  controls.autoRotate = autoRotateActive;
  let frameId;

  function stopAutoRotate() {
    if (!autoRotateActive) return;
    autoRotateActive = false;
    controls.autoRotate = false;
    if (modelRoot) status.textContent = 'Rotation paused · drag to rotate · scroll or pinch to zoom';
  }
  controls.addEventListener('start', stopAutoRotate);

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
      if (current.name && !STRUCTURE_GROUPS.has(current.name.toLowerCase()) && !/^(mesh|object|node)(?:[_\s-]*\d+)?$/i.test(current.name)) return current.name;
      current = current.parent;
    }
    return object?.name && !/^(mesh|object|node)(?:[_\s-]*\d+)?$/i.test(object.name)
      ? object.name
      : 'Anatomical structure';
  }
  function layerFor(object) {
    let current = object;
    while (current && current !== modelRoot) {
      const name = current.name?.toLowerCase().trim();
      const layer = [...STRUCTURE_GROUPS].find((candidate) => name === candidate || name.startsWith(`${candidate}_`) || name.startsWith(`${candidate}-`) || name.startsWith(`${candidate} `));
      if (layer) return layer;
      current = current.parent;
    }
    return null;
  }
  function isPrivateStructure(object) {
    let current = object;
    while (current && current !== modelRoot) {
      if (PRIVATE_STRUCTURE.test(current.name || '')) return true;
      current = current.parent;
    }
    return false;
  }
  function applyLayerVisibility() {
    if (!modelRoot) return;
    modelRoot.traverse((object) => {
      const layer = layerFor(object);
      if (isPrivateStructure(object) || layer === 'skin') object.visible = false;
      else if (layer && layerSettings.has(layer)) object.visible = layerSettings.get(layer);
    });
  }
  function labelFor(key) {
    return key.replace(/_(l|r)$/i, (part) => part.toLowerCase() === '_l' ? ' · left' : ' · right')
      .replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  function regionForKey(key) {
    const name = key.toLowerCase();
    if (/brain|eye|optic|skull|cranium|head|face|ear|nose|mouth|jaw/.test(name)) return 'head';
    if (/heart|lung|bronch|trachea|rib|sternum|chest|aorta|arter|vein|diaphragm/.test(name)) return 'chest';
    if (/kidney|renal|liver|stomach|pancrea|intestin|spleen|bladder|ureter|abdomen/.test(name)) return 'abdomen';
    if (/spine|vertebra|back|latissimus|trapezius/.test(name)) return 'back';
    if (/humerus|ulna|radius|biceps|triceps|deltoid|forearm|carpal|hand|metacarpal|phalange|wrist|shoulder|arm|pectoral/.test(name)) return 'arm';
    if (/femur|tibia|fibula|quadricep|hamstring|glute|patella|tarsal|foot|ankle|leg|calf|gastrocnemius|soleus|thigh/.test(name)) return 'leg';
    return null;
  }
  function riskFor(key) {
    const name = key.toLowerCase();
    const buckets = [];
    if (/heart|aorta|arter|vein|cardiac/.test(name)) buckets.push('heartRate', 'bloodPressure');
    if (/kidney|renal|bladder|ureter/.test(name)) buckets.push('hydration');
    if (/brain|eye|optic|nerve/.test(name)) buckets.push('sleep', 'mood', 'vision');
    if (/muscle|psoas|quadricep|hamstring|glute|bicep|tricep|deltoid|pector|latissimus|trapezius|gastrocnemius|soleus|sartorius|adductor/.test(name)) buckets.push('sleep', 'muscleStatus');
    if (/bone|femur|femoral|tibia|fibula|vertebra|spine|rib|humer|ulna|radius|pelvis|patella|clavicle|scapula|skull|cranium|sternum|phalange|metacarp|metatars|carpal|tarsal|sacrum|coccyx|mandible|maxilla/.test(name)) buckets.push('boneStatus');
    if (/liver|stomach|pancrea|intestin|spleen/.test(name)) buckets.push('bloodSugar');
    if (/lung|bronch|trachea/.test(name)) buckets.push('oxygen');
    if (/skin|epiderm/.test(name)) buckets.push('temperature');
    const levels = { normal: 0, warning: 1, moderate: 2, critical: 3 };
    const scores = buckets.map((bucket) => healthMap[bucket]).filter(Boolean);
    const region = regionForKey(key);
    if (region) {
      scores.push(healthMap.bodyRegions?.[region]);
      (healthMap.currentSymptoms || []).filter((item) => item.region === region)
        .forEach((item) => scores.push(PRIORITY_SYMPTOMS.has(item.kind) ? 'critical' : item.status));
    }
    return scores.filter(Boolean).sort((a, b) => levels[b] - levels[a])[0] || 'normal';
  }
  function linkedStructure(key) {
    return /heart|aorta|arter|vein|cardiac|kidney|renal|bladder|ureter|brain|eye|optic|nerve|muscle|psoas|quadricep|hamstring|glute|bicep|tricep|deltoid|pector|latissimus|trapezius|gastrocnemius|soleus|sartorius|adductor|bone|femur|femoral|tibia|fibula|vertebra|spine|rib|humer|ulna|radius|pelvis|patella|clavicle|scapula|sternum|phalange|metacarp|metatars|carpal|tarsal|sacrum|coccyx|mandible|maxilla|liver|stomach|pancrea|intestin|spleen|lung|bronch|trachea|skin|epiderm/.test(key.toLowerCase());
  }
  function linkedMetricIds(key) {
    const name = key.toLowerCase();
    const ids = [];
    if (/heart|aorta|arter|vein|cardiac/.test(name)) ids.push('heartRate', 'bloodPressure');
    if (/kidney|renal|bladder|ureter/.test(name)) ids.push('hydration');
    if (/brain|eye|optic|nerve/.test(name)) ids.push('sleep');
    if (/liver|stomach|pancrea|intestin|spleen/.test(name)) ids.push('bloodSugar');
    if (/lung|bronch|trachea/.test(name)) ids.push('oxygen');
    if (/skin|epiderm/.test(name)) ids.push('temperature');
    return [...new Set(ids)];
  }
  function issueFor(key, level) {
    const levels = { normal: 0, warning: 1, moderate: 2, critical: 3 };
    const region = regionForKey(key);
    const symptomLabels = {
      chest: 'Chest pain or pressure', breathing: 'Difficulty breathing', fainting: 'Fainting / loss of consciousness',
      confusion: 'Sudden confusion', weakness: 'Severe new weakness', 'rapid-worsening': 'Rapidly worsening symptoms',
      headache: 'Headache or dizziness', muscle: 'Muscle pain or weakness', vision: 'Vision changes', nausea: 'Nausea', other: 'Reported symptom',
    };
    const symptoms = (healthMap.currentSymptoms || [])
      .filter((item) => region && item.region === region && (item.status !== 'normal' || PRIORITY_SYMPTOMS.has(item.kind)))
      .slice(0, 1)
      .map((item) => `${symptomLabels[item.kind] || 'Reported symptom'} · intensity ${item.severity}/10`);
    const readings = linkedMetricIds(key)
      .map((id) => healthMap.readings?.find((item) => item.id === id && item.status !== 'normal'))
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => `${item.name}: ${item.value} ${item.unit} · ${item.status.toUpperCase()}`);
    const signals = [...symptoms, ...readings];
    if (signals.length) return signals.join('  /  ');
    return level === 'normal'
      ? 'No linked concern in recent check-ins.'
      : 'A related system indicator is flagged in the health log.';
  }
  function updateCalloutPosition() {
    if (!calloutLayer || !calloutCard || !selected || !modelRoot || !selectedAnchorWorld) return;
    camera.updateMatrixWorld();
    const point = selectedAnchorWorld.clone().project(camera);
    if (point.x < -1 || point.x > 1 || point.y < -1 || point.y > 1 || point.z < -1 || point.z > 1) { calloutLayer.hidden = true; return; }
    calloutLayer.hidden = false;
    const stage = container.querySelector('.anatomy-stage');
    const rect = stage.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const anchorX = (point.x + 1) * width / 2;
    const anchorY = (1 - point.y) * height / 2;
    const cardWidth = calloutCard.offsetWidth;
    const cardHeight = calloutCard.offsetHeight;
    const gap = 38;
    const desiredRight = anchorX < width * 0.48;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
    const positionCard = (right) => clamp(right ? anchorX + gap : anchorX - cardWidth - gap, 12, width - cardWidth - 12);
    let cardLeft = positionCard(desiredRight);
    let cardTop = clamp(anchorY - cardHeight / 2, 58, height - cardHeight - 48);
    const hud = container.querySelector('.anatomy-vitals-hud');
    if (hud) {
      const hudRect = hud.getBoundingClientRect();
      const hudLeft = hudRect.left - rect.left;
      const hudTop = hudRect.top - rect.top;
      const overlapsHud = (left) => left < hudLeft + hudRect.width + 8 && left + cardWidth > hudLeft - 8
        && cardTop < hudTop + hudRect.height + 8 && cardTop + cardHeight > hudTop - 8;
      if (overlapsHud(cardLeft)) {
        const alternate = positionCard(!desiredRight);
        if (!overlapsHud(alternate)) cardLeft = alternate;
        else cardTop = clamp(hudTop + hudRect.height + 12, 58, height - cardHeight - 48);
      }
    }
    calloutCard.style.left = `${cardLeft}px`;
    calloutCard.style.top = `${cardTop}px`;
    const cardIsRight = cardLeft > anchorX;
    const edgeX = cardIsRight ? cardLeft : cardLeft + cardWidth;
    const edgeY = cardTop + cardHeight / 2;
    const elbowX = anchorX + (cardIsRight ? 24 : -24);
    const points = `${edgeX},${edgeY} ${elbowX},${edgeY} ${elbowX},${anchorY} ${anchorX},${anchorY}`;
    calloutLine?.setAttribute('points', points);
    calloutAnchor?.setAttribute('cx', String(anchorX));
    calloutAnchor?.setAttribute('cy', String(anchorY));
    const tone = COLORS[riskFor(selected)] || COLORS.normal;
    calloutLine?.setAttribute('stroke', tone);
    calloutAnchor?.setAttribute('fill', tone);
    calloutLayer.querySelector('#anatomyCalloutArrowPath')?.setAttribute('fill', tone);
    const svg = calloutLayer.querySelector('svg');
    svg?.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  function collectStructures() {
    const index = new Map();
    if (!modelRoot) return index;
    modelRoot.traverse((object) => {
      if (!object.isMesh || isPrivateStructure(object)) return;
      if (layerFor(object) === 'skin') return;
      const key = keyFor(object);
      if (!key || key === modelRoot.name || key === 'Anatomical structure') return;
      if (!index.has(key)) index.set(key, { key, label: labelFor(key), layer: layerFor(object), objects: [] });
      index.get(key).objects.push(object);
    });
    return new Map([...index.entries()].sort(([, a], [, b]) => a.label.localeCompare(b.label)));
  }
  function renderDirectory() {
    if (!directoryList) return;
    const all = [...structureIndex.values()];
    const flagged = all.filter((part) => riskFor(part.key) !== 'normal');
    if (flaggedCount) flaggedCount.textContent = String(flagged.length);
    const query = (searchInput?.value || '').trim().toLocaleLowerCase();
    const filtered = all.filter((part) => {
      if (flaggedOnly && riskFor(part.key) === 'normal') return false;
      return !query || `${part.label} ${part.key} ${part.layer || ''}`.toLocaleLowerCase().includes(query);
    });
    if (directoryCount) directoryCount.textContent = all.length
      ? `${filtered.length} of ${all.length} structures`
      : 'Model not loaded';
    directoryList.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'directory-empty';
      empty.textContent = !all.length
        ? 'Waiting for the anatomy model…'
        : flaggedOnly && !query
          ? 'No body areas are currently flagged by entered readings or recent symptoms.'
          : 'No matching body structures. Try another search.';
      directoryList.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    filtered.forEach((part) => {
      const level = riskFor(part.key);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `anatomy-directory-item${selected === part.key ? ' selected' : ''}`;
      item.dataset.structureKey = part.key;
      item.dataset.level = level;
      item.setAttribute('aria-pressed', String(selected === part.key));
      const marker = document.createElement('i');
      marker.className = 'directory-status-dot';
      marker.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.className = 'directory-item-copy';
      const name = document.createElement('strong');
      name.textContent = part.label;
      const category = document.createElement('small');
      const layerNames = { skeleton: 'Bone', muscles: 'Muscle', organs: 'Organ', vessels: 'Vessel', nerves: 'Nerve', lymphatics: 'Lymphatic', cartilage: 'Cartilage', ligaments: 'Ligament' };
      category.textContent = layerNames[part.layer] || 'Body structure';
      copy.append(name, category);
      const state = document.createElement('span');
      state.className = 'directory-item-state';
      state.textContent = level === 'normal' ? 'STABLE' : level === 'warning' ? 'ATTENTION' : level === 'moderate' ? 'ALERT' : 'HIGH';
      item.append(marker, copy, state);
      fragment.append(item);
    });
    directoryList.append(fragment);
  }
  function preserveMaterials(root) {
    root.traverse((object) => {
      if (!object.isMesh) return;
      const original = Array.isArray(object.material) ? object.material.map((material) => material.clone()) : object.material.clone();
      originalMaterials.set(object, original);
      const layer = layerFor(object);
      const opacity = LAYER_OPACITY[layer] ?? 0.7;
      const translucent = (material) => {
        const clone = material.clone();
        clone.transparent = opacity < 1;
        clone.opacity = opacity;
        if (clone.transparent) clone.depthWrite = false;
        return clone;
      };
      object.material = Array.isArray(original) ? original.map(translucent) : translucent(original);
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
    selectedAnchorWorld = null;
    const selectedPart = structureIndex.get(key);
    if (selectedPart?.objects.length && modelRoot) {
      modelRoot.updateMatrixWorld(true);
      const bounds = new THREE.Box3().makeEmpty();
      selectedPart.objects.forEach((object) => bounds.expandByObject(object));
      if (!bounds.isEmpty()) selectedAnchorWorld = bounds.getCenter(new THREE.Vector3());
    }
    const level = riskFor(key);
    const label = labelFor(key);
    const safeLabel = label.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    const stateLabels = { normal: 'STABLE', warning: 'ATTENTION', moderate: 'MODERATE ALERT', critical: 'HIGH ALERT' };
    const name = key.toLowerCase();
    const indicators = [];
    if (/heart|aorta|arter|vein|cardiac/.test(name)) indicators.push('heart rate', 'blood pressure');
    if (/kidney|renal|bladder|ureter/.test(name)) indicators.push('hydration');
    if (/brain|eye|optic|nerve/.test(name)) indicators.push('sleep', 'vision');
    if (/muscle|psoas|quadricep|hamstring|glute|bicep|tricep|deltoid|pector|latissimus|trapezius|gastrocnemius|soleus|sartorius|adductor/.test(name)) indicators.push('sleep');
    if (/bone|femur|femoral|tibia|fibula|vertebra|spine|rib|humer|ulna|radius|pelvis|patella|clavicle|scapula|skull|cranium|sternum|phalange|metacarp|metatars|carpal|tarsal|sacrum|coccyx|mandible|maxilla/.test(name) && healthMap.boneStatus) indicators.push('bone health');
    if (/liver|stomach|pancrea|intestin|spleen/.test(name)) indicators.push('blood sugar');
    if (/lung|bronch|trachea/.test(name)) indicators.push('blood oxygen');
    if (/skin|epiderm/.test(name)) indicators.push('temperature');
    const region = regionForKey(key);
    if (region && healthMap.bodyRegions?.[region]) indicators.push(`recent ${region} symptom`);
    const linked = [...new Set(indicators)];
    const explanation = level === 'normal'
      ? 'No linked reading or symptom log currently flags this area.'
      : 'Color reflects an entered reading or a recent, user-confirmed symptom in a related body region.';
    details.innerHTML = `<span class="anatomy-risk ${level}"><i></i>${stateLabels[level]}</span><strong>${safeLabel}</strong><small>${explanation}${linked.length ? ` Linked indicators: ${linked.join(', ')}.` : ''} Illustrative only; not a diagnosis.</small><a class="anatomy-ask-link" href="assistant.html?structure=${encodeURIComponent(key)}">Ask Valmed about this area ↗</a>`;
    if (calloutLayer && calloutCard) {
      calloutLayer.hidden = !selectedAnchorWorld;
      calloutCard.dataset.level = level;
      calloutStatus?.setAttribute('data-level', level);
      if (calloutStatus) calloutStatus.textContent = stateLabels[level];
      if (calloutName) calloutName.textContent = label;
      if (calloutProblem) calloutProblem.textContent = issueFor(key, level);
      updateCalloutPosition();
    }
    renderDirectory();
    onSelect({ key, label, level });
  }
  function focusStructure(key, { automatic = false } = {}) {
    if (!automatic) stopAutoRotate();
    const part = structureIndex.get(key);
    if (!part?.objects.length) return;
    if (!automatic) window.Valmed_AUDIO?.playCue('select');
    const layer = part.layer;
    if (layer && layerSettings.get(layer) === false) {
      layerSettings.set(layer, true);
      const layerButton = container.querySelector(`[data-layer="${layer}"]`);
      layerButton?.classList.add('active');
      applyLayerVisibility();
    }
    const bounds = new THREE.Box3().makeEmpty();
    part.objects.forEach((object) => bounds.expandByObject(object));
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const direction = camera.position.clone().sub(controls.target).normalize();
    const distance = Math.max(0.55, Math.min(3.2, sphere.radius * 5.2));
    controls.minDistance = 0.35;
    controls.target.copy(center);
    camera.position.copy(center).add(direction.multiplyScalar(distance));
    controls.update();
    showSelection(key);
    if (!automatic) [...(directoryList?.querySelectorAll('[data-structure-key]') || [])]
      .find((item) => item.dataset.structureKey === key)?.focus({ preventScroll: true });
  }
  function focusFirstAffectedStructure() {
    const severity = { warning: 1, moderate: 2, critical: 3 };
    const recentRegions = [...(healthMap.currentSymptoms || [])]
      .filter((item) => item.status !== 'normal')
      .sort((a, b) => (severity[b.status] || 0) - (severity[a.status] || 0) || Date.parse(b.at || 0) - Date.parse(a.at || 0))
      .map((item) => item.region);
    const structures = [...structureIndex.values()].filter((part) => riskFor(part.key) !== 'normal');
    const priority = recentRegions.map((region) => structures.find((part) => regionForKey(part.key) === region)).find(Boolean);
    const part = priority || structures[0];
    if (part) focusStructure(part.key, { automatic: true });
    return Boolean(part);
  }
  function loadModel(sex = currentSex) {
    currentSex = sex;
    structureIndex = new Map();
    selectedAnchorWorld = null;
    if (calloutLayer) calloutLayer.hidden = true;
    renderDirectory();
    status.classList.remove('load-error');
    status.textContent = 'Loading 3D anatomy model…';
    loader.load(MODELS[sex], (gltf) => {
      if (modelRoot) scene.remove(modelRoot);
      modelRoot = gltf.scene;
      preserveMaterials(modelRoot);
      const skinButton = container.querySelector('[data-layer="skin"]');
      if (skinButton) skinButton.classList.remove('active');
      for (const button of container.querySelectorAll('[data-layer]')) layerSettings.set(button.dataset.layer, button.classList.contains('active'));
      layerSettings.set('skin', false);
      applyLayerVisibility();
      structureIndex = collectStructures();
      renderDirectory();
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
      const hasAffectedStructure = focusFirstAffectedStructure();
      status.textContent = autoRotateActive
        ? 'Auto-rotating · interact with the model or search to pause'
        : 'Rotation paused · drag to rotate · scroll or pinch to zoom';
      container.querySelector('.anatomy-load').hidden = true;
      if (!hasAffectedStructure) {
        const firstHeart = [...structureIndex.keys()].find((key) => /heart/i.test(key));
        if (firstHeart) showSelection(firstHeart);
      }
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
    if (!reducedMotion) {
      scannerPlatform.rotation.y += 0.0012;
      const pulse = performance.now() * 0.001;
      scannerPlatform.children.forEach((ring, index) => { ring.material.opacity = (index === 1 ? 0.3 : 0.13) + Math.sin(pulse + index * 1.6) * 0.055; });
    }
    controls.update();
    updateCalloutPosition();
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
    if (hit?.object) { window.Valmed_AUDIO?.playCue('select'); showSelection(keyFor(hit.object)); }
  });
  container.querySelectorAll('[data-layer]:not(:disabled)').forEach((button) => button.addEventListener('click', () => {
    window.Valmed_AUDIO?.playCue('switch');
    stopAutoRotate();
    const layer = button.dataset.layer;
    button.classList.toggle('active');
    const enabled = button.classList.contains('active');
    layerSettings.set(layer, enabled);
    applyLayerVisibility();
  }));
  container.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    window.Valmed_AUDIO?.playCue('switch');
    stopAutoRotate();
    const view = button.dataset.view;
    container.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
    controls.minDistance = 1.6;
    const sign = view === 'posterior' ? -1 : 1;
    camera.position.set(view === 'lateral' ? 3.8 : 0, 1.05, view === 'lateral' ? 0 : sign * 3.8);
    controls.target.set(0, 0.88, 0);
    controls.update();
  }));
  container.querySelector('#anatomySex')?.addEventListener('change', (event) => { stopAutoRotate(); loadModel(event.target.value); });
  container.querySelector('#anatomyRetry')?.addEventListener('click', () => { stopAutoRotate(); loadModel(currentSex); });
  container.querySelector('#anatomyReset')?.addEventListener('click', () => {
    stopAutoRotate();
    controls.minDistance = 1.6;
    camera.position.set(0, 1.05, 3.8);
    controls.target.set(0, 0.88, 0);
    controls.update();
  });
  searchInput?.addEventListener('focus', stopAutoRotate);
  searchInput?.addEventListener('input', () => { stopAutoRotate(); renderDirectory(); });
  flaggedOnlyButton?.addEventListener('click', () => {
    stopAutoRotate();
    flaggedOnly = !flaggedOnly;
    flaggedOnlyButton.setAttribute('aria-pressed', String(flaggedOnly));
    flaggedOnlyButton.classList.toggle('active', flaggedOnly);
    renderDirectory();
  });
  directoryList?.addEventListener('click', (event) => {
    const item = event.target.closest('[data-structure-key]');
    if (item && directoryList.contains(item)) focusStructure(item.dataset.structureKey);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    event.preventDefault();
    searchInput?.focus();
  });
  window.addEventListener('orbital:health-update', (event) => {
    healthMap = event.detail || {};
    applyColors();
    if (!selected || riskFor(selected) === 'normal') {
      if (!focusFirstAffectedStructure() && selected) showSelection(selected);
    } else showSelection(selected);
  });
  loadModel();

  return () => {
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
  };
}

