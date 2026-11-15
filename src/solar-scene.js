import { createEllipticalOrbitPoints, MOON_ECCENTRICITY, MOON_INITIAL_PHASE, MOON_ORBITAL_INCLINATION, MOON_ORBITAL_SPEED, MOON_VISUAL_ORBIT_RADIUS, MOON_VISUAL_RADIUS, pointOnOrbit } from './data/orbital-motion.mjs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TEXTURE_BASE = 'assets/solar-textures/';
const MODEL_BASE = 'assets/solar-models/';
const PLANET_MAPS = {
  sun: '2k_sun.jpg', mercury: '2k_mercury.jpg', venus: '2k_venus_surface.jpg',
  earth: '2k_earth_daymap.jpg', moon: '2k_moon.jpg', mars: '2k_mars.jpg', jupiter: '2k_jupiter.jpg',
  saturn: '2k_saturn.jpg', uranus: '2k_uranus.jpg', neptune: '2k_neptune.jpg',
};
const MODEL_FILES = {
  sun: 'sun.glb', mercury: 'mercury.glb', venus: 'venus.glb', earth: 'earth.glb',
  moon: 'moon.glb', mars: 'mars.glb', jupiter: 'jupiter.glb', io: 'io.glb', europa: 'europa.glb',
  ganymede: 'ganymede.glb', callisto: 'callisto.glb', saturn: 'saturn.glb', titan: 'titan.glb',
  uranus: 'uranus.glb', neptune: 'neptune.glb',
};
const MAIN_BODY_IDS = ['sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
const SATELLITES_BY_PARENT = { earth:['moon'], jupiter:['io','europa','ganymede','callisto'], saturn:['titan'] };
const SKY_DRIFT_RATE = .0032; // Cinematic accelerated drift; the sky is not an ephemeris.

function makeMap(THREE, body) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = body.id === 'earth' ? '#0b3155' : body.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let seed = body.id.split('').reduce((value, char) => value + char.charCodeAt(0), 23);
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (body.id === 'earth') {
    ctx.fillStyle = '#28664f';
    const continents = [
      [[87,84],[113,47],[150,62],[168,95],[155,118],[179,143],[157,169],[140,217],[116,225],[101,190],[92,160],[72,132]],
      [[205,233],[228,249],[238,290],[222,334],[206,304],[195,266]],
      [[359,76],[390,55],[426,70],[443,95],[479,87],[501,118],[479,148],[458,141],[446,178],[418,171],[402,195],[378,171],[367,138],[345,117]],
      [[445,209],[480,203],[507,226],[495,264],[467,282],[440,264],[423,233]],
      [[571,94],[608,78],[644,98],[663,127],[643,143],[611,129],[586,151],[563,127]],
    ];
    continents.forEach((points) => { ctx.beginPath(); ctx.moveTo(...points[0]); points.slice(1).forEach((point) => ctx.lineTo(...point)); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = '#9ea46a';
    for (let i = 0; i < 170; i++) { const x = random() * 768, y = random() * 384; ctx.globalAlpha = .08 + random() * .15; ctx.beginPath(); ctx.ellipse(x, y, 4 + random() * 16, 1 + random() * 4, random(), 0, Math.PI * 2); ctx.fill(); }
  } else if (['jupiter','saturn','uranus','neptune'].includes(body.id)) {
    const palettes = {
      jupiter: ['#d9c4a5','#9d785f','#e5d4b3','#b88e70','#6e5146'], saturn: ['#e0d1ae','#ba9e73','#eee0ba','#a78d68'],
      uranus: ['#89c7ca','#9bd9d9','#71b4c0','#b7e3df'], neptune: ['#315caa','#4278ce','#244a97','#6596de'],
    }[body.id];
    for (let y = 0; y < 384; y += 4 + Math.floor(random() * 18)) {
      ctx.globalAlpha = .28 + random() * .5; ctx.fillStyle = palettes[Math.floor(random() * palettes.length)];
      ctx.fillRect(0, y, 768, 2 + random() * 15);
      if (body.id === 'jupiter' && y > 160 && y < 260) { ctx.globalAlpha = .85; ctx.fillStyle = '#a44f39'; ctx.beginPath(); ctx.ellipse(548, y + 16, 38, 15, -.12, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = .35; ctx.strokeStyle = '#f1c69b'; ctx.lineWidth = 3; ctx.stroke(); }
    }
  } else {
    for (let i = 0; i < (body.id === 'mercury' || body.id === 'mars' ? 170 : 70); i++) {
      const x = random() * canvas.width, y = random() * canvas.height, radius = body.id === 'mercury' ? 2 + random() * 18 : 8 + random() * 34;
      ctx.globalAlpha = .06 + random() * .2; ctx.fillStyle = random() > .5 ? '#fff0d0' : '#241b18'; ctx.beginPath(); ctx.ellipse(x, y, radius, radius * (.35 + random() * .3), random(), 0, Math.PI * 2); ctx.fill();
      if (body.id === 'mercury') { ctx.globalAlpha *= .5; ctx.strokeStyle = '#f3e8d0'; ctx.stroke(); }
    }
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeCloudMap(THREE) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  let seed = 1456; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 540; i++) {
    ctx.globalAlpha = .12 + rand() * .48; ctx.fillStyle = '#fff';
    const x = rand() * canvas.width, y = rand() * canvas.height;
    ctx.beginPath(); ctx.ellipse(x, y, 5 + rand() * 45, 2 + rand() * 9, rand() * .6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function makeGlow(THREE) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d'); const glow = ctx.createRadialGradient(128,128,8,128,128,128);
  glow.addColorStop(0,'rgba(255,252,225,.75)'); glow.addColorStop(.22,'rgba(255,202,116,.42)'); glow.addColorStop(.56,'rgba(255,152,73,.11)'); glow.addColorStop(1,'rgba(255,126,60,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,256,256);return new THREE.CanvasTexture(canvas);
}

export function mountSolarScene(THREE, { canvas, bodies, onSelect, onHover, onStatus }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x03070d, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03070d, .0037);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 110);
  const target = new THREE.Vector3(-.8, 0, 0);
  let cameraDistance = 22;
  camera.position.set(target.x, 8.2, cameraDistance);
  camera.lookAt(target);
  const selectable=[];const entries=new Map();const textures=[];const geometries=[];const materials=[];const loadedModels=new Set();const failedModels=new Set();let disposed=false;

  const stars = new THREE.Group();scene.add(stars);
  let starCatalogCount=0;let starCatalogReady=false;
  function updateSceneStatus(){
    const ready=MAIN_BODY_IDS.filter((id)=>loadedModels.has(id)).length;
    if(ready===MAIN_BODY_IDS.length&&starCatalogReady)onStatus(`NASA 3D models ready · ${starCatalogCount.toLocaleString()} HYG catalog stars · Milky Way sky map`);
    else if(ready)onStatus(`NASA 3D models ${ready}/${MAIN_BODY_IDS.length} · ${starCatalogReady?`${starCatalogCount.toLocaleString()} catalog stars`:'loading HYG star catalog'}${failedModels.size?` · ${failedModels.size} local fallback(s)`:''}`);
    else if(failedModels?.size)onStatus(`NASA 3D models are loading · ${failedModels.size} model(s) are using local fallback surfaces`);
    else onStatus('Loading NASA planetary models and the HYG star catalog…');
  }
  function renderStarCatalog(csv){
    const bands=[[],[],[]];
    for(const line of csv.split(/\r?\n/)){
      if(!line||line[0]==='#')continue;
      const [rawX,rawY,rawZ,rawMagnitude,rawColorIndex]=line.split(',');
      const x=Number(rawX),y=Number(rawY),z=Number(rawZ),magnitude=Number(rawMagnitude),colorIndex=Number(rawColorIndex);
      const distance=Math.hypot(x,y,z);if(!Number.isFinite(distance+magnitude+colorIndex)||distance<=0||magnitude>=5)continue;
      const visualDistance=18+Math.log1p(distance)*8.4;
      const color=colorIndex<0?new THREE.Color('#a8d2ff').lerp(new THREE.Color('#edf6ff'),THREE.MathUtils.clamp((colorIndex+.5)/.5,0,1)):new THREE.Color('#f4f7ff').lerp(new THREE.Color('#ffad72'),THREE.MathUtils.clamp(colorIndex/1.6,0,1));
      const band=magnitude<1.5?0:1;
      bands[band].push({position:[x/distance*visualDistance,y/distance*visualDistance,z/distance*visualDistance],color});
    }
    const sizes=[.11,.065];
    bands.forEach((records,index)=>{
      if(!records.length)return;
      const positions=new Float32Array(records.length*3),colors=new Float32Array(records.length*3);
      records.forEach((record,i)=>{positions.set(record.position,i*3);colors.set([record.color.r,record.color.g,record.color.b],i*3);});
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometries.push(geometry);
      const points=new THREE.Points(geometry,new THREE.PointsMaterial({size:sizes[index],vertexColors:true,transparent:true,opacity:.62,sizeAttenuation:true,depthWrite:false}));stars.add(points);materials.push(points.material);starCatalogCount+=records.length;
    });
    starCatalogReady=starCatalogCount>0;updateSceneStatus();
  }
  fetch(`${MODEL_BASE}hyg-stars.csv`).then((response)=>{if(!response.ok)throw new Error(`Star catalog request failed (${response.status})`);return response.text();}).then(renderStarCatalog).catch(()=>onStatus('NASA planetary models are loading · the catalog starfield is unavailable.'));
  const shootingGlow=makeGlow(THREE);textures.push(shootingGlow);
  const shootingStars=[];
  function resetShootingStar(streak,wait=5+Math.random()*8){
    streak.wait=wait;streak.progress=0;streak.line.visible=false;streak.head.visible=false;
    const direction=Math.random()<.5?1:-1;
    streak.start.set(direction>0?-24:24,-10+Math.random()*20,-22+Math.random()*8);
    streak.end.set(streak.start.x+direction*(8+Math.random()*12),streak.start.y+(Math.random()-.5)*7,streak.start.z);
  }
  for(let i=0;i<2;i++){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));geometries.push(geometry);
    const material=new THREE.LineBasicMaterial({color:i===0?0xdaf5ff:0xffe3b3,transparent:true,opacity:0,depthWrite:false,toneMapped:false});materials.push(material);
    const line=new THREE.Line(geometry,material);line.frustumCulled=false;scene.add(line);
    const headMaterial=new THREE.SpriteMaterial({map:shootingGlow,color:i===0?0xdaf5ff:0xffd79c,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});materials.push(headMaterial);
    const head=new THREE.Sprite(headMaterial);head.scale.set(.55,.55,1);head.visible=false;scene.add(head);
    const streak={line,head,geometry,start:new THREE.Vector3(),end:new THREE.Vector3(),headPosition:new THREE.Vector3(),tailPosition:new THREE.Vector3(),progress:0,wait:0,duration:1.1+Math.random()*.45};
    resetShootingStar(streak,i===0?.8+Math.random()*1.4:2.5+Math.random()*2);shootingStars.push(streak);
  }
  const galaxyGeometry=new THREE.SphereGeometry(76,56,40);geometries.push(galaxyGeometry);
  const galaxyMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide,transparent:false,opacity:1,depthWrite:false,toneMapped:false});materials.push(galaxyMaterial);
  const galaxy=new THREE.Mesh(galaxyGeometry,galaxyMaterial);galaxy.rotation.set(.18,.38,.2);scene.add(galaxy);
  const galaxyLoader=new THREE.TextureLoader();
  const applyGalaxyTexture=(texture)=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());galaxyMaterial.map=texture;galaxyMaterial.needsUpdate=true;textures.push(texture);};
  const galaxyTexture=galaxyLoader.load('assets/solar-textures/milky-way-eso.jpg',applyGalaxyTexture,undefined,()=>{galaxyLoader.load('assets/solar-textures/2k_stars_milky_way.jpg',applyGalaxyTexture,undefined,()=>{});});
  textures.push(galaxyTexture);
  const ambient=new THREE.HemisphereLight(0xa9c5de,0x101018,.44);scene.add(ambient);
  const sunLight=new THREE.PointLight(0xffe1ae,340,100,1.35);sunLight.position.set(0,0,0);scene.add(sunLight);

  const system=new THREE.Group();system.rotation.x=-.56;system.rotation.z=-.04;scene.add(system);const planetaryOrbitLines=new Map();
  const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=.12;
  const pointer=new THREE.Vector2();
  const sphereGeometry=new THREE.SphereGeometry(1,56,40);geometries.push(sphereGeometry);
  const orbitalPhases={mercury:-1.3,venus:.4,earth:-.6,mars:.9,jupiter:-.4,saturn:.7,uranus:-.9,neptune:.5};

  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:makeGlow(THREE),color:0xffd69a,transparent:true,opacity:.34,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  glow.scale.set(3.4,3.4,1);system.add(glow);materials.push(glow.material);textures.push(glow.material.map);

  for(const body of bodies){
    const orbit=body.orbit?body.orbit:0;
    if(orbit){const orbitGeometry=new THREE.BufferGeometry();const orbitPoints=createEllipticalOrbitPoints(body.eccentricity,220,body.inclination).map(({x,y,z})=>new THREE.Vector3(x,y,z));orbitGeometry.setFromPoints(orbitPoints);geometries.push(orbitGeometry);const line=new THREE.LineLoop(orbitGeometry,new THREE.LineBasicMaterial({color:0x94bcd4,transparent:true,opacity:.17,depthWrite:false}));line.scale.setScalar(orbit);system.add(line);materials.push(line.material);planetaryOrbitLines.set(body.id,line);}
    const phase=orbitalPhases[body.id]??0;const initialPosition=pointOnOrbit(orbit,body.eccentricity??0,phase,body.inclination??0);
    const group=new THREE.Group();group.position.set(initialPosition.x,initialPosition.y,initialPosition.z);system.add(group);
    let satelliteSystem=null;const fallbackDecorations=[];
    const radius=body.id==='sun'?body.radius:body.radius;
    const baseMap=makeMap(THREE,body);textures.push(baseMap);
    const material=new THREE.MeshStandardMaterial({map:baseMap,color:'#ffffff',roughness:body.id==='earth'?.83:.91,metalness:0,emissive:body.id==='sun'?new THREE.Color('#ed8c32'):new THREE.Color('#05070a'),emissiveIntensity:body.id==='sun'?.62:.025});materials.push(material);
    const sphere=new THREE.Mesh(sphereGeometry,material);sphere.scale.setScalar(radius);group.add(sphere);selectable.push(sphere);
    if(body.id==='sun'){
      const corona=new THREE.Mesh(new THREE.SphereGeometry(radius*1.1,48,32),new THREE.MeshBasicMaterial({color:0xffbc68,side:THREE.BackSide,transparent:true,opacity:.11,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(corona);geometries.push(corona.geometry);materials.push(corona.material);
    }
    if(body.id==='earth'){
      satelliteSystem=new THREE.Group();satelliteSystem.position.copy(group.position);system.add(satelliteSystem);
      const cloudMaterial=new THREE.MeshStandardMaterial({map:makeCloudMap(THREE),transparent:true,opacity:.55,roughness:1,depthWrite:false});materials.push(cloudMaterial);textures.push(cloudMaterial.map);
      const clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.012,48,32),cloudMaterial);group.add(clouds);geometries.push(clouds.geometry);fallbackDecorations.push(clouds);
      const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.035,48,32),new THREE.MeshBasicMaterial({color:0x64b9f0,side:THREE.BackSide,transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(atmosphere);geometries.push(atmosphere.geometry);materials.push(atmosphere.material);
      const moonOrbitRadius=MOON_VISUAL_ORBIT_RADIUS;
      const moonOrbitGeometry=new THREE.BufferGeometry();const moonOrbitPoints=createEllipticalOrbitPoints(MOON_ECCENTRICITY,180,MOON_ORBITAL_INCLINATION).map(({x,y,z})=>new THREE.Vector3(x,y,z));moonOrbitGeometry.setFromPoints(moonOrbitPoints);geometries.push(moonOrbitGeometry);
      const moonOrbit=new THREE.LineLoop(moonOrbitGeometry,new THREE.LineBasicMaterial({color:0xc3d6e2,transparent:true,opacity:.32,depthWrite:false}));moonOrbit.scale.setScalar(moonOrbitRadius);satelliteSystem.add(moonOrbit);materials.push(moonOrbit.material);
      const moonGroup=new THREE.Group();const moonPosition=pointOnOrbit(moonOrbitRadius,MOON_ECCENTRICITY,MOON_INITIAL_PHASE,MOON_ORBITAL_INCLINATION);moonGroup.position.set(moonPosition.x,moonPosition.y,moonPosition.z);satelliteSystem.add(moonGroup);
      const moonMap=makeMap(THREE,{id:'moon',color:'#b9b9b4'});textures.push(moonMap);
      const moonMaterial=new THREE.MeshStandardMaterial({map:moonMap,color:'#deded8',roughness:1,metalness:0});materials.push(moonMaterial);
      const moon=new THREE.Mesh(sphereGeometry,moonMaterial);moon.scale.setScalar(MOON_VISUAL_RADIUS);moonGroup.add(moon);
      moon.userData.bodyId='earth';selectable.push(moon);
      entries.set('moon',{body:{id:'moon',radius:MOON_VISUAL_RADIUS,eccentricity:MOON_ECCENTRICITY,inclination:MOON_ORBITAL_INCLINATION,speed:MOON_ORBITAL_SPEED},group:moonGroup,sphere:moon,material:moonMaterial,orbit:moonOrbitRadius,parent:'earth',phase:MOON_INITIAL_PHASE,modelRoot:null,modelBaseScale:MOON_VISUAL_RADIUS,modelTargetRadius:MOON_VISUAL_RADIUS,fallbackDecorations:[]});
    }
    if(body.id==='venus'){
      const haze=new THREE.Mesh(new THREE.SphereGeometry(radius*1.075,40,28),new THREE.MeshBasicMaterial({color:0xf2c47d,side:THREE.BackSide,transparent:true,opacity:.09,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(haze);geometries.push(haze.geometry);materials.push(haze.material);
    }
    if(body.id==='saturn'){
      const ringGeo=new THREE.RingGeometry(radius*1.28,radius*2.05,96);geometries.push(ringGeo);
      const ringMap=new THREE.TextureLoader().load(TEXTURE_BASE+'2k_saturn_ring_alpha.png',undefined,undefined,()=>{});textures.push(ringMap);ringMap.colorSpace=THREE.SRGBColorSpace;
      const ringMaterial=new THREE.MeshStandardMaterial({map:ringMap,alphaMap:ringMap,color:0xddcfac,transparent:true,opacity:.84,side:THREE.DoubleSide,roughness:.96,depthWrite:false});materials.push(ringMaterial);
      const rings=new THREE.Mesh(ringGeo,ringMaterial);rings.rotation.x=Math.PI/2.45;rings.rotation.z=-.12;group.add(rings);fallbackDecorations.push(rings);
    }
    if(body.id==='uranus')group.rotation.z=Math.PI*.46;
    entries.set(body.id,{body,group,sphere,material,orbit,phase,satelliteSystem,fallbackDecorations,modelRoot:null,modelBaseScale:body.radius,modelTargetRadius:body.radius});
  }

  const satelliteDefinitions=[
    {id:'io',parent:'jupiter',name:'Io',radius:.071,orbit:1.12,speed:.21,phase:.3,color:'#d8a14d',inclination:0.4},
    {id:'europa',parent:'jupiter',name:'Europa',radius:.064,orbit:1.39,speed:.15,phase:2.1,color:'#c9b693',inclination:0.9},
    {id:'ganymede',parent:'jupiter',name:'Ganymede',radius:.084,orbit:1.70,speed:.105,phase:4.2,color:'#9d8873',inclination:1.4},
    {id:'callisto',parent:'jupiter',name:'Callisto',radius:.078,orbit:2.02,speed:.071,phase:5.1,color:'#655d53',inclination:2.1},
    {id:'titan',parent:'saturn',name:'Titan',radius:.078,orbit:1.64,speed:.095,phase:1.8,color:'#c98b49',inclination:0.35},
  ];
  for(const definition of satelliteDefinitions){
    const host=entries.get(definition.parent);if(!host)continue;
    if(!host.satelliteSystem){host.satelliteSystem=new THREE.Group();host.satelliteSystem.position.copy(host.group.position);system.add(host.satelliteSystem);}
    const satelliteSystem=host.satelliteSystem;
    const orbitGeometry=new THREE.BufferGeometry();orbitGeometry.setFromPoints(createEllipticalOrbitPoints(.006,128,definition.inclination).map(({x,y,z})=>new THREE.Vector3(x,y,z)));geometries.push(orbitGeometry);
    const orbitLine=new THREE.LineLoop(orbitGeometry,new THREE.LineBasicMaterial({color:0x9ebccc,transparent:true,opacity:.2,depthWrite:false}));orbitLine.scale.setScalar(definition.orbit);satelliteSystem.add(orbitLine);materials.push(orbitLine.material);
    const body={id:definition.id,name:definition.name,radius:definition.radius,eccentricity:.006,inclination:definition.inclination,speed:definition.speed};
    const phase=definition.phase;const position=pointOnOrbit(definition.orbit,body.eccentricity,phase,body.inclination);
    const group=new THREE.Group();group.position.set(position.x,position.y,position.z);satelliteSystem.add(group);
    const map=makeMap(THREE,{id:definition.id,color:definition.color});textures.push(map);
    const material=new THREE.MeshStandardMaterial({map,color:'#ffffff',roughness:.98,metalness:0});materials.push(material);
    const sphere=new THREE.Mesh(sphereGeometry,material);sphere.scale.setScalar(definition.radius);sphere.userData.bodyId=definition.parent;group.add(sphere);selectable.push(sphere);
    entries.set(definition.id,{body,group,sphere,material,orbit:definition.orbit,phase,parent:definition.parent,satelliteSystem:null,modelRoot:null,modelBaseScale:definition.radius,modelTargetRadius:definition.radius,fallbackDecorations:[]});
  }

  const modelLoader=new GLTFLoader();const modelQueue=[];const queuedModels=new Set();const loadingModels=new Set();let modelRequestActive=false;
  function finishModelLoad(){if(modelRequestActive)return;const nextId=modelQueue.shift();if(!nextId)return;queuedModels.delete(nextId);const entry=entries.get(nextId);const file=MODEL_FILES[nextId];if(!entry||!file||loadingModels.has(nextId)||loadedModels.has(nextId)){finishModelLoad();return;}modelRequestActive=true;loadingModels.add(nextId);
    const fail=()=>{loadingModels.delete(nextId);failedModels.add(nextId);modelRequestActive=false;updateSceneStatus();finishModelLoad();};
    modelLoader.load(`${MODEL_BASE}${file}`,(gltf)=>{
      try{
        const source=gltf.scene;source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source);const boundSphere=new THREE.Sphere();bounds.getBoundingSphere(boundSphere);
        if(!Number.isFinite(boundSphere.radius)||boundSphere.radius<=0)throw new Error(`Invalid model bounds for ${nextId}`);
        const root=new THREE.Group();source.position.sub(boundSphere.center);root.add(source);
        const targetRadius=nextId==='saturn'?entry.body.radius*2.05:entry.modelTargetRadius||entry.body.radius;
        const scale=targetRadius/boundSphere.radius;root.scale.setScalar(scale);entry.group.add(root);entry.modelRoot=root;entry.modelBaseScale=scale;
        source.traverse((object)=>{if(!object.isMesh)return;object.userData.bodyId=entry.parent||nextId;object.frustumCulled=false;object.castShadow=true;object.receiveShadow=true;selectable.push(object);for(const material of (Array.isArray(object.material)?object.material:[object.material])){if(!material)continue;if(!materials.includes(material))materials.push(material);for(const value of Object.values(material))if(value?.isTexture&&!textures.includes(value))textures.push(value);if(nextId==='sun'&&material.emissive){material.emissive.set('#fff0cc');if(!material.emissiveMap&&material.map)material.emissiveMap=material.map;material.emissiveIntensity=1.05;material.needsUpdate=true;}}});
        entry.sphere.visible=false;const fallbackIndex=selectable.indexOf(entry.sphere);if(fallbackIndex>=0)selectable.splice(fallbackIndex,1);entry.fallbackDecorations?.forEach((decoration)=>{decoration.visible=false;});
        loadingModels.delete(nextId);loadedModels.add(nextId);failedModels.delete(nextId);modelRequestActive=false;updateSceneStatus();
      }catch(error){console.warn(`Could not prepare NASA ${nextId} model`,error);fail();return;}
      finishModelLoad();
    },undefined,(error)=>{console.warn(`Could not load NASA ${nextId} model`,error);fail();});
  }
  function loadBodyModel(id,{priority=false}={}){if(!MODEL_FILES[id]||loadedModels.has(id)||loadingModels.has(id)||queuedModels.has(id))return;queuedModels.add(id);if(priority)modelQueue.unshift(id);else modelQueue.push(id);finishModelLoad();}
  function loadSatelliteModelsFor(parent){(SATELLITES_BY_PARENT[parent]||[]).forEach((id)=>loadBodyModel(id));}
  loadBodyModel('sun');loadBodyModel('earth');loadBodyModel('moon');
  const preloadRemaining=()=>{if(disposed)return;if(document.hidden){window.setTimeout(preloadRemaining,1200);return;}MAIN_BODY_IDS.forEach((id)=>loadBodyModel(id));};
  if(window.requestIdleCallback)window.requestIdleCallback(preloadRemaining,{timeout:3200});else window.setTimeout(preloadRemaining,1800);

  const textureLoader=new THREE.TextureLoader();textureLoader.setCrossOrigin('anonymous');
  const loaded=new Set();const loadedTextures=new Set();let warmupTimer=0;
  function loadBodyTexture(id){
    if(loaded.has(id)||!PLANET_MAPS[id])return;loaded.add(id);
    textureLoader.load(TEXTURE_BASE+PLANET_MAPS[id],(texture)=>{
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.push(texture);
      const entry=entries.get(id);if(entry&&!entry.modelRoot){entry.material.map=texture;entry.material.needsUpdate=true;}
      loadedTextures.add(id);updateSceneStatus();
    },undefined,()=>updateSceneStatus());
  }
  ['sun','earth','mars','moon'].forEach(loadBodyTexture);
  const textureWarmup=bodies.map((body)=>body.id).filter((id)=>PLANET_MAPS[id]&&!loaded.has(id));
  const warmNextTexture=()=>{if(disposed)return;if(document.hidden){warmupTimer=window.setTimeout(warmNextTexture,600);return;}const id=textureWarmup.shift();if(!id)return;loadBodyTexture(id);if(textureWarmup.length)warmupTimer=window.setTimeout(warmNextTexture,220);};
  if(textureWarmup.length){if(window.requestIdleCallback)window.requestIdleCallback(()=>{warmupTimer=window.setTimeout(warmNextTexture,500);},{timeout:2500});else warmupTimer=window.setTimeout(warmNextTexture,700);}
  const earthClouds=entries.get('earth')?.group.children.find((child)=>child.isMesh&&child.material?.transparent&&child.material?.map?.isCanvasTexture);
  if(earthClouds)textureLoader.load(TEXTURE_BASE+'2k_earth_clouds.jpg',(texture)=>{texture.colorSpace=THREE.SRGBColorSpace;earthClouds.material.map=texture;earthClouds.material.alphaMap=texture;earthClouds.material.needsUpdate=true;textures.push(texture);},undefined,()=>{});

  function toNdc(event){const rect=canvas.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;}
  function hitTest(event){toNdc(event);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(selectable,false);if(!hits.length)return null;const id=hits[0].object.userData.bodyId;return id||null;}
  for(const [id,entry] of entries)entry.sphere.userData.bodyId=entry.parent||id;
  let selectedId='sun';let overviewMode=true;let hoveredId=null;let dragging=null;let lastPointer=null;let targetGoal=target.clone();let cameraGoal=new THREE.Vector3();let transitionStarted=0;let transitionDuration=0;let startCamera=camera.position.clone();let startTarget=target.clone();
  function focus(id,{instant=false}={}){
    const entry=entries.get(id);if(!entry)return;selectedId=id;overviewMode=id==='sun';loadBodyTexture(id);loadBodyModel(id,{priority:true});loadSatelliteModelsFor(id);
    const world=new THREE.Vector3();entry.sphere.getWorldPosition(world);
    const overview=overviewMode;const distance=overview?22:id==='sun'?10.5:THREE.MathUtils.clamp(entry.body.radius*10,3.2,12);
    const offset=new THREE.Vector3(0,distance*.24,distance);
    if(id!=='sun'&&!overview){
      const towardSun=new THREE.Vector3().sub(world).normalize();offset.copy(towardSun).multiplyScalar(distance);offset.y+=distance*.24;
      const viewForward=offset.clone().negate().normalize();const viewRight=new THREE.Vector3().crossVectors(viewForward,camera.up).normalize();
      targetGoal.copy(world).addScaledVector(viewRight,Math.min(3.7,distance*.14));
    }else targetGoal.set(world.x+Math.min(3.7,distance*.14),world.y,world.z);
    offset.setLength(distance);
    cameraDistance=distance;zoom=cameraDistance/22;
    cameraGoal.copy(targetGoal).add(offset);
    startCamera.copy(camera.position);startTarget.copy(target);transitionStarted=performance.now();transitionDuration=instant||matchMedia('(prefers-reduced-motion: reduce)').matches?1:1050;
    onSelect(id);
  }
  let zoom=1;
  function resize(){const rect=canvas.getBoundingClientRect();const width=Math.max(1,rect.width),height=Math.max(1,rect.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=width<740?49:43;camera.updateProjectionMatrix();}
  resize();const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);

  const interactionEvents=new AbortController();
  canvas.addEventListener('pointerdown',(event)=>{if(event.button!==0&&event.button!==1&&event.button!==2)return;canvas.setPointerCapture(event.pointerId);dragging={id:event.pointerId,button:event.button,x:event.clientX,y:event.clientY,moved:0};lastPointer={x:event.clientX,y:event.clientY};},{signal:interactionEvents.signal});
  canvas.addEventListener('pointermove',(event)=>{
    const hit=hitTest(event);if(hit!==hoveredId){hoveredId=hit;onHover(hit);canvas.style.cursor=hit?'pointer':'grab';if(hit)loadBodyTexture(hit);}
    if(!dragging||dragging.id!==event.pointerId)return;
    const dx=event.clientX-lastPointer.x,dy=event.clientY-lastPointer.y;dragging.moved+=Math.abs(dx)+Math.abs(dy);lastPointer={x:event.clientX,y:event.clientY};
    if(dragging.button===2||event.shiftKey){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);targetGoal.addScaledVector(right,-dx*.014*zoom).addScaledVector(up,dy*.014*zoom);target.copy(targetGoal);camera.position.addScaledVector(right,-dx*.014*zoom).addScaledVector(up,dy*.014*zoom);}
    else{system.rotation.y+=dx*.004;system.rotation.x=Math.max(-.7,Math.min(.7,system.rotation.x+dy*.003));}
  },{signal:interactionEvents.signal});
  canvas.addEventListener('pointerup',(event)=>{if(dragging&&dragging.id===event.pointerId){if(dragging.moved<7){const id=hitTest(event);if(id)focus(id);}dragging=null;}},{signal:interactionEvents.signal});
  canvas.addEventListener('pointercancel',()=>{dragging=null;},{signal:interactionEvents.signal});
  canvas.addEventListener('contextmenu',(event)=>event.preventDefault(),{signal:interactionEvents.signal});
  canvas.addEventListener('wheel',(event)=>{
    event.preventDefault();
    const deltaScale=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1;
    const nextDistance=Math.max(2.5,Math.min(38,cameraDistance+event.deltaY*deltaScale*.012));
    // Scrolling outward from a focused body should restore the whole system,
    // including its planets, instead of only moving the camera along world Z.
    if(!overviewMode&&event.deltaY>0&&nextDistance>=18){focus('sun');return;}
    cameraDistance=nextDistance;zoom=cameraDistance/22;
    const direction=camera.position.clone().sub(target).normalize();
    if(direction.lengthSq()<.001)direction.set(0,.24,1).normalize();
    targetGoal.copy(target);cameraGoal.copy(targetGoal).addScaledVector(direction,cameraDistance);
    startCamera.copy(camera.position);startTarget.copy(target);transitionStarted=performance.now();transitionDuration=matchMedia('(prefers-reduced-motion: reduce)').matches?1:220;
  },{passive:false,signal:interactionEvents.signal});
  canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();cancelAnimationFrame(frame);window.dispatchEvent(new CustomEvent('valmed:solar-fallback'));},{signal:interactionEvents.signal});

  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;let previous=performance.now();
  function animate(time){if(disposed)return;frame=requestAnimationFrame(animate);if(document.hidden){previous=time;return;}const dt=Math.min((time-previous)/1000,.05);previous=time;
    const motionAllowed=!reducedMotion.matches;
    const overview=overviewMode;
    if(motionAllowed){stars.rotation.y+=dt*SKY_DRIFT_RATE;galaxy.rotation.y+=dt*SKY_DRIFT_RATE;if(overview)system.rotation.y+=dt*.00024;}
    glow.visible=selectedId==='sun';
    for(const [id,line] of planetaryOrbitLines)line.visible=overview;
    for(const [id,entry] of entries){
      entry.group.visible=overview||id===selectedId||entry.parent===selectedId;
      if(entry.satelliteSystem)entry.satelliteSystem.visible=overview||id===selectedId;
      if(motionAllowed){
        if(entry.orbit>0&&(entry.parent||overview)){entry.phase+=dt*entry.body.speed;const position=pointOnOrbit(entry.orbit,entry.body.eccentricity??0,entry.phase,entry.body.inclination??0);entry.group.position.set(position.x,position.y,position.z);if(entry.satelliteSystem)entry.satelliteSystem.position.copy(entry.group.position);}
        entry.group.rotation.y+=dt*(id==='sun'?.035:id==='earth'?.34:.13);
      }
      const factor=id===selectedId?(motionAllowed?1.025+Math.sin(time*.003)*.012:1.025):id===hoveredId?1.045:1;
      if(entry.modelRoot)entry.modelRoot.scale.setScalar(entry.modelBaseScale*factor);else entry.sphere.scale.setScalar(entry.body.radius*factor);
    }
    for(const streak of shootingStars){if(!motionAllowed){streak.line.visible=false;streak.head.visible=false;continue;}if(streak.wait>0){streak.wait-=dt;continue;}streak.progress+=dt/streak.duration;if(streak.progress>=1){resetShootingStar(streak);continue;}const tailProgress=Math.max(0,streak.progress-.2);streak.headPosition.lerpVectors(streak.start,streak.end,streak.progress);streak.tailPosition.lerpVectors(streak.start,streak.end,tailProgress);const attribute=streak.geometry.attributes.position;attribute.setXYZ(0,streak.tailPosition.x,streak.tailPosition.y,streak.tailPosition.z);attribute.setXYZ(1,streak.headPosition.x,streak.headPosition.y,streak.headPosition.z);attribute.needsUpdate=true;const fade=Math.sin(Math.PI*streak.progress);streak.line.material.opacity=fade*.78;streak.head.material.opacity=fade;streak.head.position.copy(streak.headPosition);streak.line.visible=true;streak.head.visible=true;}
    glow.material.opacity=motionAllowed ? .31+Math.sin(time*.0011)*.025 : .31;glow.scale.setScalar(motionAllowed ? 3.35+Math.sin(time*.0011)*.1 : 3.35);
    if(transitionDuration){const p=Math.min(1,(time-transitionStarted)/transitionDuration),ease=1-Math.pow(1-p,3);camera.position.lerpVectors(startCamera,cameraGoal,ease);target.lerpVectors(startTarget,targetGoal,ease);if(p>=1)transitionDuration=0;}
    else if(!dragging){
      const direction=cameraGoal.clone().sub(targetGoal).normalize();
      if(direction.lengthSq()<.001)direction.set(0,.24,1).normalize();
      cameraGoal.copy(targetGoal).addScaledVector(direction,cameraDistance);
      camera.position.lerp(cameraGoal,.08);
    }
    camera.lookAt(target);renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(animate);
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(frame);}else{previous=performance.now();frame=requestAnimationFrame(animate);}};document.addEventListener('visibilitychange',onVisibility);
  function reset(){system.rotation.set(-.56,0,-.04);cameraDistance=22;zoom=1;focus('sun',{instant:true});}
  function dispose(){disposed=true;cancelAnimationFrame(frame);clearTimeout(warmupTimer);resizeObserver.disconnect();interactionEvents.abort();document.removeEventListener('visibilitychange',onVisibility);renderer.dispose();geometries.forEach((geometry)=>geometry.dispose());materials.forEach((material)=>material.dispose());textures.forEach((texture)=>texture.dispose());}
  focus('sun',{instant:true});
  return {focus,reset,dispose};
}
