import assert from 'node:assert/strict';
import { findFeatureLayer, syncFeatureProperties, recordSavedFeature, persistMapDeletion } from '../src/components/map/editorState.js';

// Simulate the independent Leaflet and React snapshots across edits and exports.
const first = { _leaflet_id: 10, feature: { properties: { type: 'polygon', zoneName: 'Old name' } } };
const second = { _leaflet_id: 20, feature: { properties: { type: 'sensorCircle', name: 'Sensor' } } };
let layers = [first, second];
const group = { getLayers: () => layers };
let collection = { type: 'FeatureCollection', features: layers.map(layer => ({ type: 'Feature', properties: { ...layer.feature.properties } })) };
collection.features[0].properties.zoneName = 'Edited name';
collection.features[0].properties.fillOpacity = 0;
syncFeatureProperties(group, collection);
const exported = { type: 'FeatureCollection', features: layers.map(layer => ({ ...layer.feature, properties: { ...layer.feature.properties } })) };
assert.equal(exported.features[0].properties.zoneName, 'Edited name');
assert.equal(exported.features[0].properties.fillOpacity, 0);

// A create response arrives after another item is removed and a new edit is made.
layers = [second];
const latest = { type: 'FeatureCollection', features: [exported.features[1]] };
latest.features[0].properties.name = 'Edited while saving';
const saved = JSON.parse(recordSavedFeature(JSON.stringify(latest), second, 123));
assert.equal(saved.features[0].properties.dbId, 123);
assert.equal(saved.features[0].properties.name, 'Edited while saving');
assert.equal(findFeatureLayer(group, saved.features[0], 1), second);
assert.deepEqual(JSON.parse(recordSavedFeature(JSON.stringify(latest), first, 456)), latest);

const calls = [];
const actions = { polygon: async id => calls.push(id) };
const feature = { properties: { type: 'polygon', dbId: 123 } };
assert.equal(await persistMapDeletion(feature, actions, () => false), false);
assert.deepEqual(calls, []);
assert.equal(await persistMapDeletion(feature, actions, () => true), true);
assert.deepEqual(calls, [123]);
await assert.rejects(persistMapDeletion(feature, { polygon: async () => { throw new Error('API failed'); } }, () => true), /API failed/);
assert.equal(await persistMapDeletion({ properties: { type: 'polygon' } }, actions, () => true), true);
assert.deepEqual(calls, [123]);
console.log('Map editor regression checks passed: property/opacity preservation, save completion after removal, cancellation, persistence and API failure.');
