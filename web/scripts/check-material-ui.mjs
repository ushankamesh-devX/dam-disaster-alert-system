// Headless UI regression checks against isolated browser fixtures (no database writes).
// Start Chrome with --headless=new --remote-debugging-port=9223 and npm run preview.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.DDAS_UI_URL || 'http://127.0.0.1:4173';
const output = path.resolve('../api/local-data/ui-checks');
fs.mkdirSync(output, { recursive: true });
const pages = await fetch('http://127.0.0.1:9223/json').then(r => r.json());
const target = pages.find(p => p.type === 'page');
assert(target, 'A headless Chrome page must be available');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map(), errors = [], warnings = [];
const user = { id: 1, fullName: 'UI Test Operator', email: 'ui-test@example.invalid', status: 'active', role: { id: 1, code: 'SUPER_ADMIN', name: 'Administrator', permissions: [] } };
const region = { id: 1, name: 'UI Test Region', country: 'Sri Lanka', damCount: 1 };
const dam = { id: 1, code: 'UI-TEST', name: 'UI Test Dam', regionId: 1, regionName: region.name, region, latitude: 7.24, longitude: 80.94, status: 'operational', damType: 'gravity', hazardStatus: 'safe', heightMeters: 100, reservoirCapacityMcm: 500, riskClassification: 'low' };
const sensor = { id: 1, sensorUid: 'UI-SENSOR', name: 'UI Test Sensor', damId: 1, damName: dam.name, sensorTypeId: 1, sensorType: { id: 1, name: 'Water level', code: 'water_level', unit: 'm' }, status: 'active', latitude: 7.24, longitude: 80.94, minReading: 0, maxReading: 100, warningThreshold: 80, criticalThreshold: 95 };
const page = content => ({ content, totalElements: content.length, totalPages: 1, number: 0, size: 20 });
function fixture(url) {
  const p = new URL(url).pathname.replace('/api/v1', '');
  if (p === '/users/me') return { data: user };
  if (p === '/users') return { data: page([user]) };
  if (p.startsWith('/users/by-role') || p === '/user-activities/me') return { data: page([]) };
  if (p === '/roles') return [user.role];
  if (p === '/dams') return page([dam]);
  if (p === '/dams/1') return dam;
  if (p === '/dams/list' || p === '/dams/active') return [dam];
  if (p === '/dams/1/status') return { damId: 1, currentWaterLevelMeters: 45, reservoirFillPercentage: 50, hazardStatus: 'safe' };
  if (p === '/regions') return page([region]);
  if (p === '/regions/list') return [region];
  if (p === '/sensors') return page([sensor]);
  if (p === '/sensors/1') return sensor;
  if (p === '/sensors/dam/1') return [sensor];
  if (p === '/sensors/types') return [sensor.sensorType];
  if (/readings/.test(p)) return page(Array.from({ length: 8 }, (_, i) => ({ id: i + 1, sensorId: 1, readingValue: 45 + i, unit: 'm', quality: 'good', recordedAt: new Date(Date.now() - (7 - i) * 600000).toISOString() })));
  if (/aggregates/.test(p)) return page([]);
  if (p === '/reports' || p.includes('/news/articles')) return page([]);
  if (/stats|statistics|analytics/.test(p)) return { totalDams: 1, activeDams: 1, totalActive: 1, statusBreakdown: {}, severityBreakdown: {} };
  return [];
}
function command(method, params = {}) {
  return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) { const task = pending.get(message.id); pending.delete(message.id); if (message.error) task?.reject(Error(message.error.message)); else task?.resolve(message.result); }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) warnings.push(message.params.args.map(a => a.value || a.description).join(' '));
  if (message.method === 'Fetch.requestPaused') {
    const { requestId, request } = message.params;
    const allowed = request.method === 'GET' || request.method === 'OPTIONS';
    command('Fetch.fulfillRequest', { requestId, responseCode: allowed ? 200 : 422, responseHeaders: [
      { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: base },
      { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
    ], body: Buffer.from(JSON.stringify(allowed ? fixture(request.url) : { message: 'UI checks never write to the API' })).toString('base64') }).catch(e => errors.push(e.message));
  }
});
const evaluate = async expression => {
  const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression) { for (let i = 0; i < 60; i++) { if (await evaluate(expression)) return; await pause(200); } throw Error(`Timed out: ${expression}`); }
async function navigate(route) { await command('Page.navigate', { url: `${base}${route}` }); await waitFor(`document.querySelector('#root')?.innerText.length > 5 && !document.querySelector('#root')?.innerText.startsWith('Loading page')`); await pause(700); }
async function screenshot(name) { await pause(300); const result = await command('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(result.data, 'base64')); }
const clickText = text => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().endsWith(${JSON.stringify(text)}))?.click()`);

try {
  await command('Runtime.enable'); await command('Page.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*:8080/*' }] });
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/login');
  assert.equal(await evaluate(`document.querySelectorAll('input').length`), 2);
  assert(await evaluate(`document.querySelector('label').control?.tagName === 'INPUT'`), 'Login labels must address inputs');
  assert(await evaluate(`document.querySelector('.MuiOutlinedInput-root').getBoundingClientRect().height >= 40`), 'Material fields must retain their intended height');
  await screenshot('login-desktop');
  await navigate('/register'); assert.equal(await evaluate(`document.querySelectorAll('input').length`), 5);
  await evaluate(`localStorage.setItem('auth-storage', JSON.stringify({state: ${JSON.stringify({ user, token: 'isolated-ui-fixture' })},version:0}))`);
  const routes = ['/admin/dashboard', '/admin/dams', '/admin/dams/1', '/admin/dams/1/map', '/admin/sensors', '/admin/sensors/1', '/admin/device-keys', '/admin/alerts', '/admin/reports', '/admin/users', '/admin/regions', '/admin/roles', '/admin/news', '/admin/settings', '/admin/mapFunc', '/admin/system-safe-locations-test', '/home', '/does-not-exist'];
  for (const route of routes) {
    const before = errors.length;
    await navigate(route);
    const result = await evaluate(`({text:document.querySelector('#root').innerText.slice(0,100),mui:document.querySelectorAll('[class*="Mui"]').length,overflow:document.documentElement.scrollWidth > innerWidth})`);
    assert(!result.text.includes('Unexpected Application Error'), `${route} crashed`);
    assert(result.mui > 0, `${route} must use Material components`);
    assert.equal(errors.length, before, `${route}: ${errors.slice(before).join('; ')}`);
    console.log(`${route}: rendered (${result.mui} Material elements)`);
  }
  await navigate('/admin/dams'); await clickText('Add Dam');
  await waitFor(`!!document.querySelector('[role="dialog"]')`);
  await waitFor(`!!document.activeElement.closest('[role="dialog"]')`);
  assert(await evaluate(`document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby') && !!document.activeElement.closest('[role="dialog"]')`), 'Dialog must be labelled and trap initial focus');
  assert(await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] input[type="number"]')).some(i=>i.step==='any')`), 'Number step constraints must survive the refactor');
  await screenshot('dam-dialog');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('[role="dialog"]')`);
  await screenshot('dams-desktop');
  const forms = [['/admin/sensors', 'Add Sensor'], ['/admin/users', 'Add User'], ['/admin/alerts', 'Create Alert'], ['/admin/alerts', 'Region Broadcast'], ['/admin/alerts', 'Emergency Override'], ['/admin/device-keys', 'Generate API Key']];
  for (const [route, action] of forms) {
    await navigate(route); await clickText(action);
    await waitFor(`!!document.querySelector('[role="dialog"]')`);
    await waitFor(`!!document.activeElement.closest('[role="dialog"]')`);
    assert(await evaluate(`!!document.getElementById(document.querySelector('[role="dialog"]').getAttribute('aria-labelledby'))`), `${action} needs an accessible title`);
    const first = await evaluate(`document.querySelector('[role="dialog"] input')?.id`);
    if (first) {
      // Exercise the existing React onChange handlers without submitting a record.
      await evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(first)}); if(input.type==='text'){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'UI check');input.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
      await pause(100);
      assert(await evaluate(`document.activeElement.closest('[role="dialog"]') !== null`), 'Typing must not reset dialog focus');
    }
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor(`!document.querySelector('[role="dialog"]')`);
    console.log(`${action}: labelled dialog, input handling, Escape`);
  }
  await navigate('/admin/dams/1/map');
  assert(await evaluate(`!!document.querySelector('.leaflet-container') && !!document.querySelector('.leaflet-pm-toolbar')`), 'The map and drawing tools must still mount');
  await screenshot('map-desktop');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/admin/dams');
  await evaluate(`document.querySelector('[aria-label="Toggle navigation"]').click()`);
  await waitFor(`!!document.querySelector('.MuiDrawer-modal')`);
  await screenshot('navigation-mobile');
  await navigate('/login'); await screenshot('login-mobile');
  assert(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Mobile login must fit the viewport');
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ routes: routes.length + 2, errors, warnings }, null, 2));
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(`Passed: ${routes.length + 2} routes, dialog keyboard/focus/number constraints, responsive navigation and login. Fixtures only; no API writes.`);
} finally { await evaluate(`localStorage.removeItem('auth-storage')`).catch(() => {}); socket.close(); }
