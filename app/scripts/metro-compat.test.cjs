const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const { installNativeWindChangeCompat } = require('./metro-nativewind-compat.cjs');

test('virtual CSS changes satisfy Metro change maps and preserve the legacy queue', () => {
  const root = path.resolve(__dirname, '..');
  const file = path.join(root, 'node_modules', '.cache', 'android.js');
  const original = { eventsQueue: [{ filePath: file, metadata: { type: 'virtual', size: 1 }, type: 'change' }] };
  const emitter = new EventEmitter();
  installNativeWindChangeCompat(emitter, root);
  let received;
  emitter.on('change', event => {
    received = event;
    // The dependency-graph operations that previously crashed on addedFiles.
    const files = [...event.changes.addedFiles, ...event.changes.modifiedFiles, ...event.changes.removedFiles];
    assert.equal(path.join(event.rootDir, files[0][0]), file);
  });
  emitter.emit('change', original);
  assert.equal(received.eventsQueue, original.eventsQueue);
  assert.equal(original.changes, undefined);
});
test('modern Metro events and unrelated events are passed through unchanged', () => {
  const emitter = new EventEmitter();
  installNativeWindChangeCompat(emitter, __dirname);
  const modern = { changes: { addedFiles: new Map(), modifiedFiles: new Map(), removedFiles: new Map() } };
  emitter.on('change', event => assert.equal(event, modern));
  emitter.emit('change', modern);
  const other = { value: 1 };
  emitter.on('status', event => assert.equal(event, other));
  emitter.emit('status', other);
});
test('compatibility bridge is installed only once', () => {
  const emitter = new EventEmitter();
  installNativeWindChangeCompat(emitter, __dirname);
  const emit = emitter.emit;
  installNativeWindChangeCompat(emitter, __dirname);
  assert.equal(emitter.emit, emit);
});
