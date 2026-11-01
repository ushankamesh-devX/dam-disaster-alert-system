const path = require('node:path');
const installed = Symbol.for('ddas.nativewind.change-events');

// NativeWind v4 emits its legacy virtual-file event. Metro 0.83+ also requires
// a rootDir and change maps. Preserve the queue for existing interop listeners.
function installNativeWindChangeCompat(haste, projectRoot) {
  if (haste[installed]) return;
  haste[installed] = true;
  const emit = haste.emit;
  haste.emit = function (name, event, ...args) {
    if (name === 'change' && !event?.changes && event?.eventsQueue?.length &&
        event.eventsQueue.every(item => item.metadata?.type === 'virtual')) {
      event = {
        ...event,
        rootDir: projectRoot,
        changes: {
          addedFiles: new Map(),
          removedFiles: new Map(),
          modifiedFiles: new Map(event.eventsQueue.map(item => [path.relative(projectRoot, item.filePath), item.metadata])),
        },
      };
    }
    return emit.call(this, name, event, ...args);
  };
}
module.exports = { installNativeWindChangeCompat };
