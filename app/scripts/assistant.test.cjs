const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function service(post) {
  const source = fs.readFileSync(path.join(__dirname, '../services/ai/ai.service.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports, require: name => {
    assert.equal(name, '../api');
    return { axiosInstance: { post }, ENDPOINTS: { AI: { CHAT: '/ai/chat' } } };
  } });
  return module.exports;
}

test('assistant sends the selected dam with a trimmed question and cancellation signal', async () => {
  const controller = new AbortController();
  const api = service(async (route, body, config) => {
    assert.equal(route, '/ai/chat');
    assert.equal(body.dam_id, 6);
    assert.equal(body.query, 'Explain the water level');
    assert.equal(config.signal, controller.signal);
    assert.equal(config.timeout, 75000);
    return { data: { data: { dam_id: 6, answer: 'An answer', sources: [] } } };
  });
  assert.equal((await api.askAssistant(' Explain the water level ', 6, controller.signal)).answer, 'An answer');
});
test('general questions omit dam context; blank and oversized questions make no request', async () => {
  let requests = 0;
  const api = service(async (_route, body) => {
    requests++;
    assert.equal('dam_id' in body, false);
    return { data: { data: { dam_id: null, answer: 'General answer' } } };
  });
  await assert.rejects(api.askAssistant('   '));
  await assert.rejects(api.askAssistant('x'.repeat(2001)));
  assert.equal(requests, 0);
  await api.askAssistant('What can you explain?');
  assert.equal(requests, 1);
});
test('empty answers and responses for another dam are rejected', async () => {
  for (const data of [null, { dam_id: 6, answer: '' }, { dam_id: 5, answer: 'Other dam' }]) {
    await assert.rejects(service(async () => ({ data: { data } })).askAssistant('Explain', 6));
  }
});
test('server failures remain failures and never become invented answers', async () => {
  const failure = new Error('offline');
  await assert.rejects(service(async () => { throw failure; }).askAssistant('Explain', 6), error => error === failure);
});
