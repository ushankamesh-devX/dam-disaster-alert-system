/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the screen's callbacks with controlled network replies and timers.
function screenHarness() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const timers = new Map();
  const requests = [];
  const changed = (a, b) => !a || a.some((value, i) => value !== b[i]);
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useRef(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: value };
      return slots[i];
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps)) {
        const previous = slots[i];
        slots[i] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const parts = { SearchBar: 'SearchBar', ReportsList: 'ReportsList', AddReportModal: 'AddReportModal' };
  const mocks = {
    react,
    'react-native': { View: 'View', TouchableOpacity: 'TouchableOpacity' },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
    '@/components/ScreenLayout': { ScreenLayout: 'ScreenLayout' },
    '@/components/pages/ReportIssues': parts,
    'react-i18next': { useTranslation: () => ({ t: (_, fallback) => fallback }) },
    '@/services/reports/reports.service': {
      resolveReportMediaUrl: url => url,
      reportsService: { getFeed: params => new Promise((resolve, reject) => requests.push({ params, resolve, reject })) },
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/report.tsx'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  let timerId = 0;
  vm.runInNewContext(js, {
    module, exports: module.exports,
    require(name) { if (!(name in mocks)) throw new Error(name); return mocks[name]; },
    console: { error() {} },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  function render() {
    cursor = 0;
    const root = module.exports.default();
    const result = {};
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Object.values(parts).includes(node.type)) result[node.type] = node.props;
      node.props?.children?.flat().forEach(visit);
    }
    visit(root);
    const pending = effects; effects = []; pending.forEach(fn => fn());
    return result;
  }
  return {
    render, requests,
    runTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
    settle: () => new Promise(resolve => setImmediate(resolve)),
  };
}

const reply = (content = [], totalPages = 3) => ({ data: { content, totalPages } });
const report = id => ({ id, description: `Report ${id}`, mediaUrls: [] });

test('initial failure stops automatic pagination and waits for explicit retry', async () => {
  const h = screenHarness();
  h.render(); h.runTimers();
  assert.equal(h.requests.length, 1, 'initial load must not be duplicated');
  h.requests[0].reject(new Error('Offline'));
  await h.settle();
  let view = h.render();
  assert.equal(view.ReportsList.hasMore, false);
  assert.equal(view.ReportsList.error, 'Offline');
  for (let i = 0; i < 5; i++) view.ReportsList.onLoadMore();
  assert.equal(h.requests.length, 1);
  view.ReportsList.onRetry();
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve(reply([report(1)])); await h.settle();
  view = h.render();
  assert.equal(view.ReportsList.error, '');
  assert.equal(view.ReportsList.reports.length, 1);
});

test('repeated end events send one request and a failed next page preserves reports', async () => {
  const h = screenHarness();
  h.render(); h.runTimers();
  h.requests[0].resolve(reply([report(1)])); await h.settle();
  let view = h.render();
  view.ReportsList.onLoadMore(); view.ReportsList.onLoadMore();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].params.page, 1);
  h.requests[1].reject(new Error('Offline')); await h.settle();
  view = h.render();
  assert.equal(view.ReportsList.reports.length, 1);
  assert.equal(view.ReportsList.error, 'Offline');
  view.ReportsList.onLoadMore();
  assert.equal(h.requests.length, 2);
});

test('search invalidates old replies and debounces to one request for the latest query', async () => {
  const h = screenHarness();
  h.render(); h.runTimers();
  h.render().SearchBar.onSearchChange('old'); h.render();
  h.render().SearchBar.onSearchChange('latest'); h.render();
  h.requests[0].resolve(reply([report(1)])); await h.settle();
  assert.equal(h.render().ReportsList.reports.length, 0);
  h.runTimers();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].params.search, 'latest');
  h.requests[1].resolve(reply([report(2)], 1)); await h.settle();
  const view = h.render();
  assert.equal(view.ReportsList.reports[0].id, '2');
  assert.equal(view.ReportsList.hasMore, false);
});

test('overlapping pages do not produce duplicate report cards', async () => {
  const h = screenHarness();
  h.render(); h.runTimers();
  h.requests[0].resolve(reply([report(1)])); await h.settle();
  h.render().ReportsList.onLoadMore();
  h.requests[1].resolve(reply([report(1), report(2)], 2)); await h.settle();
  assert.equal(h.render().ReportsList.reports.map(item => item.id).join(','), '1,2');
});
