/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(session) {
  const slots = [];
  let cursor = 0, effects = [], dismissed = 0;
  const routes = [];
  const router = { replace: route => routes.push(route) };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((value, index) => value !== slots[i].deps[index])) {
        const previous = slots[i]; slots[i] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const Stack = Object.assign(() => {}, { Protected: 'Protected', Screen: 'Screen' });
  const mocks = {
    react,
    'react-native': {
      Keyboard: { dismiss: () => dismissed++ }, Platform: { OS: 'android' },
      StyleSheet: { create: styles => styles },
      ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'Text', 'View', 'KeyboardAvoidingView', 'ScrollView', 'TextInput'].map(name => [name, name])),
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
    'expo-router': { Stack, useRouter: () => router },
    'expo-router/react-navigation': { ThemeProvider: 'ThemeProvider' },
    '@/hooks/use-color-scheme': { useColorScheme: () => 'light' },
    '@/contexts/AuthContext': { AuthProvider: 'AuthProvider', useAuth: () => session },
    '@/components/ai/FloatingAssistant': { FloatingAssistant: 'FloatingAssistant' },
    '@/components/auth/AuthUI': { AuthScaffold: 'AuthScaffold', FormField: 'FormField', FormError: 'FormError', PrimaryButton: 'PrimaryButton', styles: {} },
    '@/services/auth/error-message': { authErrorMessage: error => error.message },
    '@/services/dams/dam.service': { damService: { getActive: async () => ({ data: [{ id: 2, name: 'Victoria', code: 'VIC' }] }) } },
    '../global.css': {}, 'react-native-reanimated': {}, '../i18n/i18n': {},
  };
  function load(file) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(js, { React: react, module, exports: module.exports, require(name) {
      if (!(name in mocks)) throw new Error(name);
      return mocks[name];
    } });
    return module.exports;
  }
  function render(component) {
    cursor = 0;
    const tree = component();
    const pending = effects; effects = []; pending.forEach(fn => fn());
    return tree;
  }
  function find(tree, predicate) {
    if (!tree || typeof tree !== 'object') return;
    if (predicate(tree)) return tree;
    for (const child of tree.props?.children?.flat(Infinity) ?? []) {
      const result = find(child, predicate); if (result) return result;
    }
  }
  return { load, render, find, routes, Stack, get dismissed() { return dismissed; }, settle: () => new Promise(resolve => setImmediate(resolve)) };
}

test('login and dam changes preserve navigator identity while protected routes update', () => {
  const session = { user: null, booting: false, restoreError: false };
  const h = harness(session);
  const layout = h.load('app/_layout.tsx').default;
  const navigator = layout().props.children[0].type;
  const stack = () => h.find(h.render(navigator), node => node.type === h.Stack);
  const key = stack().props.key;
  session.user = { id: 7, preferredDamId: null, onboardingCompletedAt: null };
  assert.equal(stack().props.key, key);
  session.user = { ...session.user, preferredDamId: 2, onboardingCompletedAt: '2026-11-02' };
  const readyStack = stack();
  assert.equal(readyStack.props.key, key, 'saving a dam must not remount onboarding');
  assert.equal(h.find(readyStack, node => node.type === 'Protected').props.guard, false, 'login is hidden after sign-in');
});

test('one login press submits credentials and dismisses the keyboard', async () => {
  const calls = [];
  const session = { login: async payload => { calls.push(payload); } };
  const h = harness(session);
  const screen = h.load('app/auth.tsx').default;
  let tree = h.render(screen);
  h.find(tree, node => node.props.label === 'Email address').props.onChangeText('person@example.invalid');
  h.find(tree, node => node.props.label === 'Password').props.onChangeText('test-password');
  tree = h.render(screen);
  h.find(tree, node => node.type === 'PrimaryButton').props.onPress();
  await h.settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].email, 'person@example.invalid');
  assert.equal(h.dismissed, 1);
});

test('one onboarding save navigates after the updated profile arrives', async () => {
  let saves = 0;
  const session = {
    user: { id: 7, preferredDamId: null, languagePreference: 'en' },
    completeOnboarding: async (id, language) => {
      saves++;
      session.user = { ...session.user, preferredDamId: id, languagePreference: language, onboardingCompletedAt: '2026-11-02' };
    },
  };
  const h = harness(session);
  const screen = h.load('app/onboarding.tsx').default;
  h.render(screen); await h.settle();
  let tree = h.render(screen);
  h.find(tree, node => node.props.accessibilityRole === 'radio' && node.props.key === 2).props.onPress();
  tree = h.render(screen);
  h.find(tree, node => node.type === 'PrimaryButton').props.onPress();
  await h.settle(); h.render(screen);
  assert.equal(saves, 1);
  assert.deepEqual(h.routes, ['/(tabs)']);
  assert.equal(h.dismissed, 1);
});

test('form buttons receive the first tap while the keyboard is open', () => {
  const h = harness({});
  const scaffold = h.load('components/auth/AuthUI.tsx').AuthScaffold;
  const tree = scaffold({ children: 'form' });
  const scroll = h.find(tree, node => node.type === 'ScrollView');
  assert.equal(scroll.props.keyboardShouldPersistTaps, 'always');
});
