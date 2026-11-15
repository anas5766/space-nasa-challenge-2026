// Run from the repository with Playwright available on NODE_PATH (or locally).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'), path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true});
 try {
 const ctx=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
 const origin='http://127.0.0.1:4196',root=path.resolve(__dirname,'..');
 let chatRequests=0;
 await ctx.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname==='/api/ollama/models')return route.fulfill({json:{models:[{name:'qa:local'}]}});
  if(url.pathname==='/api/ollama/chat'){chatRequests++;return route.fulfill({json:{message:{content:'Test response'}}});}
  const file=path.join(root,url.pathname);
  try{return await route.fulfill({body:await fs.readFile(file),contentType:({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});}catch{return route.abort();}
 });
 await ctx.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.copiedReport=t}}}));
 const pg=await ctx.newPage(),errors=[];pg.on('pageerror',err=>errors.push(String(err)));
 pg.setDefaultTimeout(5000);
 const go=async file=>pg.goto(origin+'/'+file), loc=s=>pg.locator(s), click=s=>loc(s).click(), read=(k)=>pg.evaluate(key=>JSON.parse(localStorage.getItem(key)),k);
 await go('health.html');await click('#healthLog');
 assert.equal(await loc('[name=sleep]').inputValue(),'5.8');await click('#healthForm [value=default]');assert.equal(await loc('#healthDialog').isVisible(),false);
 for(const selector of ['.dialog-close','.button-quiet']){await click('#healthLog');await loc('[name=sleep]').fill('99');await click('#healthForm '+selector);assert.equal(await loc('#healthDialog').isVisible(),false);}
 await click('#healthLog');await loc('[name=sleep]').fill('6');await click('#healthForm [value=default]');
 const sleepLabel=()=>loc('.metric-card').filter({has:loc('.metric-name').filter({hasText:'Sleep'})}).locator('.metric-state').innerText();
 assert.equal(await sleepLabel(),'CRITICAL');await go('index.html');assert.equal(await sleepLabel(),'CRITICAL');assert.equal(await loc('#overviewProgress').innerText(),'NOT SCORED');assert.doesNotMatch(await loc('body').innerText(),/IN ORBIT|DAY 128/i);
 await go('anatomy.html');assert.match(await loc('#anatomyHudSleepMeta').innerText(),/CRITICAL/);
 console.log('PASS: demo sleep, Close/Cancel, consistent state, header and score');
 await go('health.html');
 const key='valmed-mission-context-v1';
 for(const [name,val] of [['humidityPct','150'],['cabinPressureKpa','-20'],['sleepQuality1to5','9']]){
   const before=await read(key);await loc('[name='+name+']').fill(val);await pg.reload();assert.deepEqual(await read(key),before);assert.notEqual(await loc('[name='+name+']').inputValue(),val);
 }
 const b=await ctx.newPage();await b.goto(origin+'/health.html');await click('#resetMissionContext');
 await b.waitForFunction(()=>document.querySelector('[name=missionDay]').value==='');await b.locator('[name=humidityPct]').fill('46');
 await pg.waitForFunction(()=>document.querySelector('[name=humidityPct]').value==='46');assert.equal(await loc('[name=missionDay]').inputValue(),'');
 await loc('#healthChartMetric').selectOption('sleep');assert.equal(await loc('#healthChart svg').count(),0);assert.ok(await loc('.risk-finding[data-state=unknown]').count()>0);
 console.log('PASS: three invalid values rejected, reset across tabs, lunar trend and metric comparison excluded');
 const protocol=async(kind,answer)=>{await loc('#protocolForm [name=symptom]').selectOption(kind);for(const q of await loc('#protocolQuestions select').all())await q.selectOption(answer);await click('#protocolForm [type=submit]');};
 await protocol('chest','yes');await go('index.html');await go('health.html');await click('[data-resume]');assert.equal(await loc('#protocolResult [data-level]').getAttribute('data-level'),'emergency');
 await loc('#protocolAction').fill('QA action');await click('#saveProtocolOutcome');await loc('#protocolStatus').selectOption('improving');await click('#saveProtocolOutcome');assert.equal((await read('valmed-protocol-runs-v1'))[0].status,'improving');
 await loc('#protocolForm [name=symptom]').selectOption('muscle');assert.equal(await loc('#protocolResult article').count(),0);await protocol('muscle','no');await loc('#protocolStatus').selectOption('resolved');await click('#saveProtocolOutcome');
 await go('assistant.html');await pg.getByText('Protocol emergency escalation is active').waitFor();await go('health.html');
 console.log('PASS: resume after navigation, save twice, stale result cleared, older emergency retained');
 for(let i=1;i<=7;i++){await click('#symptomAdd');assert.equal(await loc('#symptomForm [name=note]').inputValue(),'');assert.equal(await loc('#symptomForm [name=severity]').inputValue(),'3');await loc('#symptomForm [name=kind]').selectOption('other');await loc('#symptomForm [name=note]').fill('QA-note-'+i);await click('#symptomForm [value=default]');}
 await click('#healthReport');const report=await pg.evaluate(()=>window.copiedReport);for(let i=1;i<=7;i++)assert.ok(report.includes('QA-note-'+i));assert.match(report,/chest pain/i);assert.equal(await loc('[data-remove-symptom]').count(),(await read('orbital-symptoms')).length);
 console.log('PASS: all notes in report and list; fresh note defaults');
 await go('assistant.html');
 await pg.evaluate(()=>localStorage.clear());await pg.reload();
 const send=async t=>{await loc('#assistantPrompt').fill(t);await click('#assistantSend');};
 const first=chatRequests;await send('Prueba sintética de QA: tengo dolor en el pecho 2/10.');let [entry]=await read('orbital-symptoms');assert.equal(entry.kind,'chest');assert.equal(entry.severity,2);assert.equal(chatRequests,first);assert.match(await loc('.assistant-message.assistant').last().innerText(),/checklist/i);
 await send('Synthetic QA: I have no chest pain, but my leg hurts 3/10.');[entry]=await read('orbital-symptoms');assert.equal(entry.region,'leg');assert.equal(entry.severity,3);await pg.reload();assert.match(await loc('#medicalAssistant').innerText(),/my leg hurts/);
 await pg.evaluate(()=>localStorage.clear());await go('health.html');await click('#symptomAdd');
 await loc('#symptomForm [name=kind]').selectOption('chest');await click('#symptomForm [value=default]');
 const beforeAuto=chatRequests;await go('assistant.html');
 await pg.waitForFunction(()=>document.querySelector('.assistant-message.assistant:last-child')?.innerText.includes('checklist'));
 assert.equal(chatRequests,beforeAuto);
 console.log('PASS: automatic alert for chest pain at 3/10 uses fixed guidance');
 console.log('PASS: Spanish classification and intensity, deterministic alert, mixed negation, persistent chat');assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
