const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { exports: module.exports, module, require: name => {
    if (name in mocks) return mocks[name];
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return module.exports;
}

function transport(adapter) {
  let token = 'old-user-token', cleared = 0, expired = 0;
  const storage = { get: async () => token, clear: async () => { token = null; cleared++; } };
  const api = load('services/api/axios.instance.ts', {
    axios: { create: config => axios.create({ ...config, adapter }) },
    '@env': { API_BASE_URL: 'http://localhost/api/v1', API_TIMEOUT: '20000', API_USE_EXPO_PROXY: 'false' },
    'expo-constants': { default: {} }, './token.storage': { tokenStorage: storage },
  });
  api.setUnauthorizedHandler(() => expired++);
  return { api: api.axiosInstance, setToken: value => { token = value; }, state: () => ({ token, cleared, expired }) };
}
function unauthorized(config) {
  throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {}, headers: {}, config });
}

test('expired account session clears its token and never signs in as a demo viewer', async () => {
  let requests = 0;
  const client = transport(async config => { requests++; return unauthorized(config); });
  await assert.rejects(client.api.get('/users/me'));
  assert.equal(requests, 1);
  assert.deepEqual(client.state(), { token: null, cleared: 1, expired: 1 });
});
test('failed login does not invoke authenticated-session expiry handling', async () => {
  const client = transport(async config => {
    assert.equal(config.headers.Authorization, undefined);
    return unauthorized(config);
  });
  await assert.rejects(client.api.post('/auth/login', { email: 'test@example.invalid', password: 'wrong' }));
  assert.equal(client.state().cleared, 0);
  assert.equal(client.state().expired, 0);
});
test('late unauthorized response cannot sign out a different, newly logged-in user', async () => {
  const client = transport(async config => { client.setToken('new-user-token'); return unauthorized(config); });
  await assert.rejects(client.api.get('/users/me'));
  assert.deepEqual(client.state(), { token: 'new-user-token', cleared: 0, expired: 0 });
});
test('registration stores the returned personal token', async () => {
  let saved;
  const { authService } = load('services/auth/auth.service.ts', { '../api': {
    ENDPOINTS: { AUTH: { REGISTER: '/auth/register' } },
    axiosInstance: { post: async () => ({ data: { data: { token: 'personal-token', user: { id: 7 } } } }) },
    tokenStorage: { set: async token => { saved = token; } },
  } });
  await authService.register({ fullName: 'Test', email: 'test@example.invalid', password: 'test-only' });
  assert.equal(saved, 'personal-token');
});
test('incomplete authentication response cannot become a saved session', async () => {
  let saved = false;
  const { authService } = load('services/auth/auth.service.ts', { '../api': {
    ENDPOINTS: { AUTH: { LOGIN: '/auth/login' } },
    axiosInstance: { post: async () => ({ data: { data: { user: { id: 7 } } } }) },
    tokenStorage: { set: async () => { saved = true; } },
  } });
  await assert.rejects(authService.login({ email: 'test@example.invalid', password: 'test-only' }));
  assert.equal(saved, false);
});
test('dam choice wins over the former Victoria default and has no silent fallback', () => {
  const { pickDisplayedDam } = load('services/dams/display-dam.ts');
  const dams = [{ id: 2, code: 'DEMO-002', name: 'Victoria Dam' }, { id: 6, name: 'Another dam' }];
  assert.equal(pickDisplayedDam(dams, 6), dams[1]);
  assert.equal(pickDisplayedDam(dams, 999), undefined);
  assert.equal(pickDisplayedDam(dams, null), undefined);
});
test('native token storage uses a new secure key and supports sign-out', async () => {
  let value = null;
  const keys = [];
  const { tokenStorage } = load('services/api/token.storage.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-secure-store': {
      getItemAsync: async key => { keys.push(key); return value; },
      setItemAsync: async (key, token) => { keys.push(key); value = token; },
      deleteItemAsync: async key => { keys.push(key); value = null; },
    },
  });
  assert.equal(await tokenStorage.get(), null);
  await tokenStorage.set('personal-token');
  assert.equal(await tokenStorage.get(), 'personal-token');
  await tokenStorage.clear();
  assert.equal(await tokenStorage.get(), null);
  assert.ok(keys.every(key => key === 'user_session_v1'));
});
