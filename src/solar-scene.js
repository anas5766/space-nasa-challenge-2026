import { createEllipticalOrbitPoints, MOON_ECCENTRICITY, MOON_INITIAL_PHASE, MOON_ORBITAL_INCLINATION, MOON_ORBITAL_SPEED, MOON_VISUAL_ORBIT_RADIUS, MOON_VISUAL_RADIUS, pointOnOrbit } from './data/orbital-motion.mjs';

const TEXTURE_BASE = 'assets/solar-textures/';
const PLANET_MAPS = {
  sun: '2k_sun.jpg', mercury: '2k_mercury.jpg', venus: '2k_venus_surface.jpg',
  earth: '2k_earth_daymap.jpg', moon: '2k_moon.jpg', mars: '2k_mars.jpg', jupiter: '2k_jupiter.jpg',
  saturn: '2k_saturn.jpg', uranus: '2k_uranus.jpg', neptune: '2k_neptune.jpg',
};

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
  let cameraDistance = 28;
  camera.position.set(target.x, 10.8, cameraDistance);
  camera.lookAt(target);
  const selectable=[];const entries=new Map();const textures=[];const geometries=[];const materials=[];

  const starCount = 1450;
  const positions = new Float32Array(starCount * 3), colors = new Float32Array(starCount * 3), starColors = ['#d8ebff','#fffaf1','#9dc8ff'];
  for (let i=0;i<starCount;i++) {
    const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1), radius=42+Math.random()*45;
    positions[i*3]=radius*Math.sin(phi)*Math.cos(theta); positions[i*3+1]=radius*Math.cos(phi); positions[i*3+2]=radius*Math.sin(phi)*Math.sin(theta);
    const c=new THREE.Color(starColors[Math.floor(Math.random()*starColors.length)]); colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));starGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({size:.085,vertexColors:true,transparent:true,opacity:.8,sizeAttenuation:true,depthWrite:false}));scene.add(stars);
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
  const galaxyMaterial=new THREE.MeshBasicMaterial({color:0x79889a,side:THREE.BackSide,transparent:true,opacity:.2,depthWrite:false,toneMapped:false});materials.push(galaxyMaterial);
  const galaxy=new THREE.Mesh(galaxyGeometry,galaxyMaterial);galaxy.rotation.set(.18,.38,.2);scene.add(galaxy);
  const galaxyTexture=new THREE.TextureLoader().load('assets/solar-textures/2k_stars_milky_way.jpg',(texture)=>{texture.colorSpace=THREE.SRGBColorSpace;galaxyMaterial.map=texture;galaxyMaterial.needsUpdate=true;textures.push(texture);},undefined,()=>{});
  textures.push(galaxyTexture);
  const ambient=new THREE.HemisphereLight(0x8ebcda,0x050810,.26);scene.add(ambient);
  const sunLight=new THREE.PointLight(0xffd39a,290,90,1.45);sunLight.position.set(0,0,0);scene.add(sunLight);

  const system=new THREE.Group();system.rotation.x=-.56;system.rotation.z=-.04;scene.add(system);
  const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=.12;
  const pointer=new THREE.Vector2();
  const sphereGeometry=new THREE.SphereGeometry(1,56,40);geometries.push(sphereGeometry);
  const orbitalPhases={mercury:-1.3,venus:.4,earth:-.6,mars:.9,jupiter:-.4,saturn:.7,uranus:-.9,neptune:.5};

  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:makeGlow(THREE),color:0xffd69a,transparent:true,opacity:.76,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  glow.scale.set(8.2,8.2,1);system.add(glow);materials.push(glow.material);textures.push(glow.material.map);

  for(const body of bodies){
    const orbit=body.orbit?body.orbit:0;
    if(orbit){const orbitGeometry=new THREE.BufferGeometry();const orbitPoints=createEllipticalOrbitPoints(body.eccentricity,220,body.inclination).map(({x,y,z})=>new THREE.Vector3(x,y,z));orbitGeometry.setFromPoints(orbitPoints);geometries.push(orbitGeometry);const line=new THREE.LineLoop(orbitGeometry,new THREE.LineBasicMaterial({color:0x94bcd4,transparent:true,opacity:.17,depthWrite:false}));line.scale.setScalar(orbit);system.add(line);materials.push(line.material);}
    const phase=orbitalPhases[body.id]??0;const initialPosition=pointOnOrbit(orbit,body.eccentricity??0,phase,body.inclination??0);
    const group=new THREE.Group();group.position.set(initialPosition.x,initialPosition.y,initialPosition.z);system.add(group);
    let satelliteSystem=null;
    const radius=body.id==='sun'?body.radius:body.radius;
    const baseMap=makeMap(THREE,body);textures.push(baseMap);
    const material=new THREE.MeshStandardMaterial({map:baseMap,color:'#ffffff',roughness:body.id==='earth'?.83:.91,metalness:0,emissive:body.id==='sun'?new THREE.Color('#ed8c32'):new THREE.Color('#05070a'),emissiveIntensity:body.id==='sun'?.62:.025});materials.push(material);
    const sphere=new THREE.Mesh(sphereGeometry,material);sphere.scale.setScalar(radius);group.add(sphere);selectable.push(sphere);
    if(body.id==='sun'){
      const corona=new THREE.Mesh(new THREE.SphereGeometry(radius*1.16,48,32),new THREE.MeshBasicMaterial({color:0xffa94d,side:THREE.BackSide,transparent:true,opacity:.21,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(corona);geometries.push(corona.geometry);materials.push(corona.material);
    }
    if(body.id==='earth'){
      satelliteSystem=new THREE.Group();satelliteSystem.position.copy(group.position);system.add(satelliteSystem);
      const cloudMaterial=new THREE.MeshStandardMaterial({map:makeCloudMap(THREE),transparent:true,opacity:.55,roughness:1,depthWrite:false});materials.push(cloudMaterial);textures.push(cloudMaterial.map);
      const clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.012,48,32),cloudMaterial);group.add(clouds);geometries.push(clouds.geometry);
      const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.075,48,32),new THREE.MeshBasicMaterial({color:0x4ca8ed,side:THREE.BackSide,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(atmosphere);geometries.push(atmosphere.geometry);materials.push(atmosphere.material);
      const moonOrbitRadius=MOON_VISUAL_ORBIT_RADIUS;
      const moonOrbitGeometry=new THREE.BufferGeometry();const moonOrbitPoints=createEllipticalOrbitPoints(MOON_ECCENTRICITY,180,MOON_ORBITAL_INCLINATION).map(({x,y,z})=>new THREE.Vector3(x,y,z));moonOrbitGeometry.setFromPoints(moonOrbitPoints);geometries.push(moonOrbitGeometry);
      const moonOrbit=new THREE.LineLoop(moonOrbitGeometry,new THREE.LineBasicMaterial({color:0xc3d6e2,transparent:true,opacity:.32,depthWrite:false}));moonOrbit.scale.setScalar(moonOrbitRadius);satelliteSystem.add(moonOrbit);materials.push(moonOrbit.material);
      const moonGroup=new THREE.Group();const moonPosition=pointOnOrbit(moonOrbitRadius,MOON_ECCENTRICITY,MOON_INITIAL_PHASE,MOON_ORBITAL_INCLINATION);moonGroup.position.set(moonPosition.x,moonPosition.y,moonPosition.z);satelliteSystem.add(moonGroup);
      const moonMap=makeMap(THREE,{id:'moon',color:'#b9b9b4'});textures.push(moonMap);
      const moonMaterial=new THREE.MeshStandardMaterial({map:moonMap,color:'#deded8',roughness:1,metalness:0});materials.push(moonMaterial);
      const moon=new THREE.Mesh(sphereGeometry,moonMaterial);moon.scale.setScalar(MOON_VISUAL_RADIUS);moonGroup.add(moon);
      entries.set('moon',{body:{id:'moon',radius:MOON_VISUAL_RADIUS,eccentricity:MOON_ECCENTRICITY,inclination:MOON_ORBITAL_INCLINATION,speed:MOON_ORBITAL_SPEED},group:moonGroup,sphere:moon,material:moonMaterial,orbit:moonOrbitRadius,parent:'earth',phase:MOON_INITIAL_PHASE});
    }
    if(body.id==='venus'){
      const haze=new THREE.Mesh(new THREE.SphereGeometry(radius*1.075,40,28),new THREE.MeshBasicMaterial({color:0xf2c47d,side:THREE.BackSide,transparent:true,opacity:.09,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(haze);geometries.push(haze.geometry);materials.push(haze.material);
    }
    if(body.id==='saturn'){
      const ringGeo=new THREE.RingGeometry(radius*1.28,radius*2.05,96);geometries.push(ringGeo);
      const ringMap=new THREE.TextureLoader().load(TEXTURE_BASE+'2k_saturn_ring_alpha.png',undefined,undefined,()=>{});textures.push(ringMap);ringMap.colorSpace=THREE.SRGBColorSpace;
      const ringMaterial=new THREE.MeshStandardMaterial({map:ringMap,alphaMap:ringMap,color:0xddcfac,transparent:true,opacity:.84,side:THREE.DoubleSide,roughness:.96,depthWrite:false});materials.push(ringMaterial);
      const rings=new THREE.Mesh(ringGeo,ringMaterial);rings.rotation.x=Math.PI/2.45;rings.rotation.z=-.12;group.add(rings);
    }
    if(body.id==='uranus')group.rotation.z=Math.PI*.46;
    entries.set(body.id,{body,group,sphere,material,orbit,phase,satelliteSystem});
  }

  const textureLoader=new THREE.TextureLoader();textureLoader.setCrossOrigin('anonymous');
  const loaded=new Set();const loadedTextures=new Set();let warmupTimer=0;
  function loadBodyTexture(id){
    if(loaded.has(id)||!PLANET_MAPS[id])return;loaded.add(id);
    textureLoader.load(TEXTURE_BASE+PLANET_MAPS[id],(texture)=>{
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.push(texture);
      const entry=entries.get(id);if(entry){entry.material.map=texture;entry.material.needsUpdate=true;}
      loadedTextures.add(id);onStatus(loadedTextures.size===Object.keys(PLANET_MAPS).length?'All local planetary maps loaded.':'High-detail planetary maps are loading locally.');
    },undefined,()=>onStatus('Using local procedural maps; a planetary texture could not be reached.'));
  }
  ['sun','earth','mars','moon'].forEach(loadBodyTexture);
  const textureWarmup=bodies.map((body)=>body.id).filter((id)=>PLANET_MAPS[id]&&!loaded.has(id));
  const warmNextTexture=()=>{if(disposed)return;if(document.hidden){warmupTimer=window.setTimeout(warmNextTexture,600);return;}const id=textureWarmup.shift();if(!id)return;loadBodyTexture(id);if(textureWarmup.length)warmupTimer=window.setTimeout(warmNextTexture,220);};
  if(textureWarmup.length){if(window.requestIdleCallback)window.requestIdleCallback(()=>{warmupTimer=window.setTimeout(warmNextTexture,500);},{timeout:2500});else warmupTimer=window.setTimeout(warmNextTexture,700);}
  const earthClouds=entries.get('earth')?.group.children.find((child)=>child.isMesh&&child.material?.transparent&&child.material?.map?.isCanvasTexture);
  if(earthClouds)textureLoader.load(TEXTURE_BASE+'2k_earth_clouds.jpg',(texture)=>{texture.colorSpace=THREE.SRGBColorSpace;earthClouds.material.map=texture;earthClouds.material.alphaMap=texture;earthClouds.material.needsUpdate=true;textures.push(texture);},undefined,()=>{});

  function toNdc(event){const rect=canvas.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;}
  function hitTest(event){toNdc(event);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(selectable,false);if(!hits.length)return null;const id=hits[0].object.userData.bodyId;return id||null;}
  for(const [id,entry] of entries)entry.sphere.userData.bodyId=id;
  let selectedId='sun';let hoveredId=null;let dragging=null;let lastPointer=null;let targetGoal=target.clone();let cameraGoal=new THREE.Vector3();let transitionStarted=0;let transitionDuration=0;let startCamera=camera.position.clone();let startTarget=target.clone();
  function focus(id,{instant=false}={}){
    const entry=entries.get(id);if(!entry)return;selectedId=id;loadBodyTexture(id);
    const world=new THREE.Vector3();entry.sphere.getWorldPosition(world);
    targetGoal.set(world.x+3.7,world.y,world.z);
    const offset=id==='sun'?new THREE.Vector3(0,7,25):new THREE.Vector3(0,Math.max(1.1,entry.body.radius*2.8),Math.max(14,entry.body.radius*13));
    cameraDistance=offset.z;zoom=cameraDistance/28;
    cameraGoal.copy(targetGoal).add(offset);
    startCamera.copy(camera.position);startTarget.copy(target);transitionStarted=performance.now();transitionDuration=instant||matchMedia('(prefers-reduced-motion: reduce)').matches?1:1050;
    onSelect(id);
  }
  let zoom=1;
  function resize(){const rect=canvas.getBoundingClientRect();const width=Math.max(1,rect.width),height=Math.max(1,rect.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=width<740?49:43;camera.position.z=cameraDistance;camera.updateProjectionMatrix();}
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
  canvas.addEventListener('wheel',(event)=>{event.preventDefault();cameraDistance=Math.max(14,Math.min(38,cameraDistance+event.deltaY*.012));zoom=cameraDistance/28;},{passive:false,signal:interactionEvents.signal});
  canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();cancelAnimationFrame(frame);window.dispatchEvent(new CustomEvent('valmed:solar-fallback'));},{signal:interactionEvents.signal});

  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;let previous=performance.now();let disposed=false;
  function animate(time){if(disposed)return;frame=requestAnimationFrame(animate);if(document.hidden){previous=time;return;}const dt=Math.min((time-previous)/1000,.05);previous=time;
    const motionAllowed=!reducedMotion.matches;
    if(motionAllowed){stars.rotation.y+=dt*.0007;galaxy.rotation.y+=dt*.00008;system.rotation.y+=dt*.00024;}
    for(const [id,entry] of entries){if(motionAllowed){if(entry.orbit>0){entry.phase+=dt*entry.body.speed;const position=pointOnOrbit(entry.orbit,entry.body.eccentricity??0,entry.phase,entry.body.inclination??0);entry.group.position.set(position.x,position.y,position.z);if(entry.satelliteSystem)entry.satelliteSystem.position.copy(entry.group.position);}entry.group.rotation.y+=dt*(id==='sun'?.035:id==='earth'?.34:.13);}if(id===selectedId)entry.sphere.scale.setScalar(entry.body.radius*(motionAllowed?1.025+Math.sin(time*.003)*.012:1.025));else if(id===hoveredId)entry.sphere.scale.setScalar(entry.body.radius*1.045);else entry.sphere.scale.setScalar(entry.body.radius);}
    for(const streak of shootingStars){if(!motionAllowed){streak.line.visible=false;streak.head.visible=false;continue;}if(streak.wait>0){streak.wait-=dt;continue;}streak.progress+=dt/streak.duration;if(streak.progress>=1){resetShootingStar(streak);continue;}const tailProgress=Math.max(0,streak.progress-.2);streak.headPosition.lerpVectors(streak.start,streak.end,streak.progress);streak.tailPosition.lerpVectors(streak.start,streak.end,tailProgress);const attribute=streak.geometry.attributes.position;attribute.setXYZ(0,streak.tailPosition.x,streak.tailPosition.y,streak.tailPosition.z);attribute.setXYZ(1,streak.headPosition.x,streak.headPosition.y,streak.headPosition.z);attribute.needsUpdate=true;const fade=Math.sin(Math.PI*streak.progress);streak.line.material.opacity=fade*.78;streak.head.material.opacity=fade;streak.head.position.copy(streak.headPosition);streak.line.visible=true;streak.head.visible=true;}
    glow.material.opacity=motionAllowed ? .68+Math.sin(time*.0011)*.06 : .7;glow.scale.setScalar(motionAllowed ? 8.1+Math.sin(time*.0011)*.3 : 8.1);
    if(transitionDuration){const p=Math.min(1,(time-transitionStarted)/transitionDuration),ease=1-Math.pow(1-p,3);camera.position.lerpVectors(startCamera,cameraGoal,ease);target.lerpVectors(startTarget,targetGoal,ease);if(p>=1)transitionDuration=0;}
    else if(!dragging){camera.position.z+=(cameraDistance-camera.position.z)*.08;}
    camera.lookAt(target);renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(animate);
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(frame);}else{previous=performance.now();frame=requestAnimationFrame(animate);}};document.addEventListener('visibilitychange',onVisibility);
  function reset(){system.rotation.set(-.56,0,-.04);cameraDistance=28;zoom=1;focus('sun');}
  function dispose(){disposed=true;cancelAnimationFrame(frame);clearTimeout(warmupTimer);resizeObserver.disconnect();interactionEvents.abort();document.removeEventListener('visibilitychange',onVisibility);renderer.dispose();geometries.forEach((geometry)=>geometry.dispose());materials.forEach((material)=>material.dispose());textures.forEach((texture)=>texture.dispose());}
  focus('sun',{instant:true});
  return {focus,reset,dispose};
}
