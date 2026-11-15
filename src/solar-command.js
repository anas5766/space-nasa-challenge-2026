import { readHealthSnapshot } from './health-state.js';
import { SOLAR_BODIES, solarBodyById } from './data/solar-navigation.mjs';

const root=document.getElementById('solarCommand');
if(root){
  const selector=document.getElementById('planetSelector');
  const fallback=document.getElementById('solarFallback');
  const status=document.getElementById('solarStatus');
  const sceneCanvas=document.getElementById('solarCanvas');
  const selected=SOLAR_BODIES[0];
  let activeId=selected.id;
  let scene=null;
  let tourTimer=0;
  let tourIndex=0;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');

  selector.innerHTML=SOLAR_BODIES.map((body,index)=>`<button class="planet-choice${index===0?' is-selected':''}" type="button" data-planet="${body.id}" aria-pressed="${index===0}" aria-label="${body.name}: ${body.feature}"><span class="planet-swatch swatch-${body.id}" aria-hidden="true"></span><span class="planet-choice-label"><b>${body.id==='sun'?'SUN':body.name.toUpperCase()}</b><small>${body.id==='sun'?'COMMAND':body.feature.toUpperCase()}</small></span></button>`).join('');

  const fallbackOrbits=Array.from({length:5},(_,index)=>`<i class="fallback-orbit fallback-orbit-${index+1}" aria-hidden="true"></i>`).join('');
  fallback.innerHTML=`${fallbackOrbits}${SOLAR_BODIES.map((body,index)=>`<span class="fallback-body fallback-${body.id}" data-fallback-planet="${body.id}" style="--fallback-x:${index===0?50:11+index*9.6}%;--fallback-y:${50+Math.sin(index*.85)*20}%"><i></i><b>${body.id==='sun'?'SUN':body.name.toUpperCase()}</b></span>`).join('')}`;

  function renderMissionRail(){
    let context={};let history=[];let demoId='';
    try{context=JSON.parse(localStorage.getItem('valmed-mission-context-v1')||'{}');}catch{}
    try{history=JSON.parse(localStorage.getItem('orbital-history')||'[]');}catch{}
    try{demoId=localStorage.getItem('valmed-demo-mission-150d-active')||'';}catch{}
    const snapshot=readHealthSnapshot();
    const isDemo=demoId.includes('synthetic');
    let crewMode=false;try{crewMode=localStorage.getItem('valmed-crew-record-mode')==='active';}catch{}
    document.getElementById('solarMode').textContent=isDemo?'SYNTHETIC DEMO':crewMode?'CREW RECORD':'NO MISSION DATA';
    const latestDay=[...history].sort((a,b)=>(b.missionDay||b.missionContext?.missionDay||0)-(a.missionDay||a.missionContext?.missionDay||0))[0];
    const missionDay=context.missionDay||latestDay?.missionDay||latestDay?.missionContext?.missionDay;
    document.getElementById('solarMissionId').textContent=isDemo?'LUNAR · SYNTHETIC DEMO':context.missionId||'NOT ASSIGNED';
    document.getElementById('solarCrewId').textContent=context.crewId||'NOT AVAILABLE';
    document.getElementById('solarMissionDay').textContent=missionDay?`DAY ${missionDay}${isDemo?' / 150':''}`:isDemo?'DAY 150 / 150':'NOT RECORDED';
    const location={earth:'EARTH',leo:'LOW EARTH ORBIT',iss:'ISS',transit:'DEEP SPACE',lunar_orbit:'LUNAR ORBIT',lunar_surface:'LUNAR SURFACE'}[context.location]||'NOT RECORDED';
    const gravity={earth:'1 G',microgravity:'MICROGRAVITY',lunar:'LUNAR GRAVITY',mars:'MARS GRAVITY',artificial:'ARTIFICIAL GRAVITY',unknown:'GRAVITY UNKNOWN'}[context.gravity]||'NOT RECORDED';
    document.getElementById('solarEnvironment').textContent=`${location} · ${gravity}`;
    const state=snapshot.assessment.overallState;
    const labels={unknown:'INSUFFICIENT DATA',normal:'NO REVIEW SIGNAL',attention:'REVIEW SIGNAL',urgent:'URGENT · FOLLOW PROTOCOL'};
    const alert=document.getElementById('solarAlertState');alert.textContent=labels[state]||'INSUFFICIENT DATA';alert.dataset.state=state;
    return snapshot;
  }

  function renderBody(id,{moveCamera=true,preview=false}={}){
    const body=solarBodyById(id);if(!preview)activeId=body.id;
    document.getElementById('planetIndex').textContent=`${body.order} / 09`;
    document.getElementById('planetKind').textContent=body.type;
    document.getElementById('planetName').textContent=body.name.toUpperCase();
    document.getElementById('planetFeature').textContent=body.feature;
    document.getElementById('planetDescription').textContent=body.description;
    const snapshot=renderMissionRail();
    const details=body.id==='earth'?`${snapshot.currentReadings.length} current reading${snapshot.currentReadings.length===1?'':'s'} · ${snapshot.currentSymptoms.length} recent symptom${snapshot.currentSymptoms.length===1?'':'s'}`:body.id==='sun'?`${snapshot.assessment.overallState.toUpperCase()} · health review from local data`:body.facts;
    document.getElementById('planetFacts').textContent=details;
    const link=document.getElementById('planetEnter');link.href=body.href;link.innerHTML=`${body.action} <span aria-hidden="true">↗</span>`;
    document.getElementById('planetDetail').dataset.body=body.id;
    selector.querySelectorAll('.planet-choice').forEach((button)=>{const chosen=button.dataset.planet===(preview?activeId:body.id);button.classList.toggle('is-selected',chosen);button.setAttribute('aria-pressed',String(chosen));});
    fallback.querySelectorAll('.fallback-body').forEach((planet)=>planet.classList.toggle('is-selected',planet.dataset.fallbackPlanet===body.id));
    if(moveCamera)scene?.focus(body.id);
  }

  function selectFromButton(button){renderBody(button.dataset.planet);}
  selector.addEventListener('click',(event)=>{const button=event.target.closest('[data-planet]');if(button){stopTour();selectFromButton(button);}});
  selector.addEventListener('keydown',(event)=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();const buttons=[...selector.querySelectorAll('.planet-choice')];const index=buttons.indexOf(document.activeElement);
    const target=event.key==='Home'?buttons[0]:event.key==='End'?buttons.at(-1):buttons[(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];target.focus();
  });
  document.getElementById('solarReset').addEventListener('click',()=>{stopTour();renderBody('sun');scene?.reset();});

  function showFallback(reason){root.classList.add('solar-no-webgl');status.textContent=reason||'3D scene unavailable · use the planet selector to explore VALMED.';status.dataset.state='fallback';}
  status.textContent='Building the solar system…';
  import('./solar-scene.js').then(({mountSolarScene})=>import('three').then((THREE)=>{
    scene=mountSolarScene(THREE,{canvas:sceneCanvas,bodies:SOLAR_BODIES,onSelect:(id)=>renderBody(id,{moveCamera:false}),onHover:(id)=>renderBody(id||activeId,{moveCamera:false,preview:true}),onStatus:(message)=>{status.textContent=message;}});
    root.dataset.solarReady='true';
    status.textContent='3D solar system ready · distances and sizes are visually compressed.';
  })).catch((error)=>{root.dataset.solarError=error?.message||'Renderer unavailable';showFallback('3D rendering unavailable · using the accessible solar system view.');});
  window.addEventListener('valmed:solar-fallback',()=>showFallback('3D context lost · use the accessible planet selector.'));

  function stopTour(){if(tourTimer){clearInterval(tourTimer);tourTimer=0;}const button=document.getElementById('cinematicToggle');button.setAttribute('aria-pressed','false');button.innerHTML='▶ <span>CINEMATIC EXPLORATION</span>';root.classList.remove('cinematic-active');}
  document.getElementById('cinematicToggle').addEventListener('click',()=>{
    if(tourTimer){stopTour();return;}
    root.classList.add('cinematic-active');tourIndex=0;
    const button=document.getElementById('cinematicToggle');button.setAttribute('aria-pressed','true');button.innerHTML='Ⅱ <span>STOP EXPLORATION</span>';
    const visit=()=>{renderBody(SOLAR_BODIES[tourIndex].id);tourIndex++;if(tourIndex>=SOLAR_BODIES.length)stopTour();};
    visit();tourTimer=setInterval(visit,reducedMotion.matches?2800:2100);
  });
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape')stopTour();});
  window.addEventListener('storage',(event)=>{if(!event.key||['orbital-metrics','orbital-symptoms','orbital-history','valmed-mission-context-v1','valmed-demo-mission-150d-active'].includes(event.key))renderBody(activeId,{moveCamera:false});});
  window.addEventListener('orbital:health-update',()=>renderBody(activeId,{moveCamera:false}));
  window.addEventListener('pagehide',()=>{stopTour();scene?.dispose();},{once:true});
  renderBody(selected.id,{moveCamera:false});
}
