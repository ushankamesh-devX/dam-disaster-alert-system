const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load({ dam = { id: 6, status: 'operational' }, status = { damId: 6, waterLevelMeters: 0, floodRiskScore: 92 }, forecasts = [], statusError = false, forecastError = false } = {}) {
  const calls = [];
  const reply = data => Promise.resolve({ data });
  const mocks = {
    './dam.service': { damService: { getById: id => { calls.push(id); return reply(dam); } } },
    './dam-status.service': { damStatusService: { getByDam: id => { calls.push(id); return statusError ? Promise.reject(new Error('offline')) : reply(status); } } },
    '../forecasts/forecast.service': { forecastService: { getLatest: id => { calls.push(id); return forecastError ? Promise.reject(new Error('offline')) : reply({ success: true, data: forecasts }); } } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../services/dams/dashboard.service.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports, require: name => {
    if (!(name in mocks)) throw new Error(name);
    return mocks[name];
  } });
  return { ...module.exports, calls };
}

test('all requests use the selected dam; zero water level remains zero and risk is not a percentage fallback', async () => {
  const service = load();
  const result = await service.loadDashboard(6);
  assert.deepEqual(service.calls, ['6', '6', '6']);
  assert.equal(result.current.waterLevelMeters, 0);
  assert.equal(result.current.waterLevelPercentage, undefined);
  assert.equal(service.formatMeasurement(result.current.waterLevelMeters, 'm'), '0 m');
  for (const value of [null, undefined, '', 'bad', NaN, Infinity, false]) assert.equal(service.formatMeasurement(value), 'Unavailable');
});

test('forecast failure preserves available measurements; status failure preserves forecasts', async () => {
  const result = await load({ forecastError: true }).loadDashboard(6);
  assert.equal(result.current.damId, 6);
  assert.equal(result.forecastsFailed, true);
  const other = await load({ statusError: true, forecasts: [{ id: 1, damId: 6, isPublished: true, horizonHours: 3 }] }).loadDashboard(6);
  assert.equal(other.current, null);
  assert.equal(other.measurementsFailed, true);
  assert.equal(other.forecasts.length, 1);
});

test('a different or inactive dam is rejected without substituting data', async () => {
  for (const dam of [{ id: 5, status: 'operational' }, { id: 6, status: 'decommissioned' }, null]) {
    const service = load({ dam });
    await assert.rejects(service.loadDashboard(6));
    assert.equal(service.calls.length, 1);
  }
});

test('measurements and forecasts belonging to another dam are not displayed', async () => {
  const result = await load({ status: { damId: 5 }, forecasts: [{ damId: 5 }] }).loadDashboard(6);
  assert.equal(result.current, null);
  assert.equal(result.forecasts.length, 0);
  assert.equal(result.measurementsFailed, true);
  assert.equal(result.forecastsFailed, true);
});

test('only published horizons are returned in chronological order and an empty run stays empty', async () => {
  const result = await load({ forecasts: [
    { id: 3, damId: 6, horizonHours: 6, isPublished: true },
    { id: 1, damId: 6, horizonHours: 1, isPublished: false },
    { id: 2, damId: 6, horizonHours: 3, isPublished: true },
  ] }).loadDashboard(6);
  assert.equal(result.forecasts.map(row => row.id).join(','), '2,3');
  assert.equal((await load().loadDashboard(6)).forecasts.length, 0);
});

test('server-local timestamps are labelled without applying the phone timezone', () => {
  const service = load();
  assert.equal(service.formatRecordedTime('2026-11-01T12:30:15.123456'), '2026-11-01 12:30:15 (server time)');
  assert.equal(service.formatRecordedTime(null), 'Unavailable');
});
