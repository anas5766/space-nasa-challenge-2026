const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const origin = 'http://127.0.0.1:4196';
const root = path.resolve(__dirname, '..');
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', viewport: { width: 1365, height: 900 } });
    let chatRequests = 0;
    let ollamaUnavailable = false;
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/api/ollama/models') return ollamaUnavailable
        ? route.fulfill({ status: 503, json: { error: 'Ollama unavailable in browser QA' } })
        : route.fulfill({ json: { models: [{ name: 'qa:local' }] } });
      if (url.pathname === '/api/ollama/chat') {
        chatRequests++;
        const content = JSON.stringify({ assessment: 'Prototype QA', nextSteps: 'Local QA response', tellMedicalTeam: 'Share changes at the next check-in.', limits: 'Test response only.' });
        return route.fulfill({ json: { message: { content } } });
      }
      const file = path.join(root, url.pathname);
      try { return await route.fulfill({ body: await fs.readFile(file), contentType: contentTypes[path.extname(file)] || 'application/octet-stream' }); }
      catch { return route.fulfill({ status: 404, body: 'Not found' }); }
    });
    await context.addInitScript(() => {
      localStorage.setItem('valmed-crew-record-mode', 'active');
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value) => { window.copiedReport = value; } } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    const go = (file) => page.goto(`${origin}/${file}`);
    const loc = (selector) => page.locator(selector);
    const click = (selector) => loc(selector).click();
    const read = (key) => page.evaluate((name) => JSON.parse(localStorage.getItem(name)), key);

    for (const file of ['index.html', 'health.html', 'hazards.html', 'anatomy.html', 'assistant.html', 'training.html']) {
      await go(file);
      assert.ok((await loc('h1').first().innerText()).trim(), `${file} should have a visible page heading`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${file} should not overflow the viewport`);
      assert.equal(await page.locator('img:not([alt])').count(), 0, `${file} images should have alt attributes`);
      assert.equal(await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map((node) => node.id); return new Set(ids).size === ids.length; }), true, `${file} should not have duplicate IDs`);
    }
    await page.setViewportSize({ width: 1365, height: 900 });
    await go('anatomy.html');
    await page.waitForFunction(() => document.querySelector('#anatomyStatus')?.textContent.includes('Could not initialize the 3D viewer'));
    await page.setViewportSize({ width: 390, height: 844 });
    for (const file of ['index.html', 'health.html', 'hazards.html', 'anatomy.html', 'assistant.html', 'training.html']) {
      await go(file);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${file} should fit a mobile viewport`);
    }
    await page.setViewportSize({ width: 1365, height: 900 });
    await go('health.html');
    assert.ok(await loc('.metric-state').filter({ hasText: 'NOT RECORDED' }).count() >= 1, 'empty crew record keeps readings explicitly missing');
    await click('#healthLog');
    assert.equal(await loc('#healthForm [name=sleep]').inputValue(), '', 'check-in starts blank');
    await loc('#healthForm [name=heartRate]').fill('999');
    await click('#healthForm [value=default]');
    assert.equal(await loc('#healthDialog').isVisible(), true, 'invalid measurement is rejected by form constraints');
    await loc('#healthForm [name=heartRate]').fill('');
    await loc('#healthForm [name=heartRate]').fill('72');
    await loc('#healthForm [name=sleep]').fill('7');
    await click('#healthForm [value=default]');
    assert.equal((await read('orbital-metrics')).length, 2, 'partial check-in saves only entered values');
    assert.equal(await loc('.metric-card').filter({ has: loc('.metric-name').filter({ hasText: 'Blood oxygen' }) }).locator('.metric-state').innerText(), 'NOT RECORDED');
    await click('#setHealthBaseline');
    assert.ok(await read('valmed-personal-reference-v1'));
    await click('#symptomAdd');
    await loc('#symptomForm [name=kind]').selectOption('muscle');
    await loc('#symptomForm [name=region]').selectOption('leg');
    await loc('#symptomForm [name=severity]').fill('3');
    await click('#symptomForm [value=default]');
    assert.equal((await read('orbital-symptoms'))[0].region, 'leg');
    await click('#healthReport');
    assert.match(await page.evaluate(() => window.copiedReport), /Heart rate: 72 bpm/);
    assert.match(await page.evaluate(() => window.copiedReport), /Sleep: 7 hrs/);
    assert.match(await page.evaluate(() => window.copiedReport), /USER-ENTERED/i);
    await page.reload();
    assert.equal((await read('orbital-metrics')).length, 2, 'health data survives reload');
    await go('assistant.html');
    await loc('#assistantPrompt').fill('What does this prototype do?');
    await click('#assistantSend');
    assert.equal(chatRequests, 1, 'local assistant request reaches the same-origin API');
    assert.match(await loc('#medicalAssistant').innerText(), /Local QA response/);
    ollamaUnavailable = true;
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#assistantConnection')?.textContent.includes('Ollama unavailable in browser QA'));
    assert.deepEqual(errors, []);
    console.log('PASS: six page routes render without horizontal overflow');
    console.log('PASS: desktop/mobile width and basic image/ID accessibility checks');
    console.log('PASS: blank partial check-in, shared assessment data, reference, symptoms, report, persistence, and local AI request');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
