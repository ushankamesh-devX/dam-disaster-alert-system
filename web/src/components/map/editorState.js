// Keep editable properties on Leaflet layers: every later export reads these values.
export function findFeatureLayer(group, feature, index) {
  const layers = group?.getLayers() || [];
  const id = feature?.properties?._editorId;
  return id != null
    ? layers.find(layer => layer._leaflet_id === id)
    : layers[index];
}

export function syncFeatureProperties(group, collection) {
  collection.features.forEach((feature, index) => {
    const layer = findFeatureLayer(group, feature, index);
    if (!layer) return;
    feature.properties = { ...feature.properties, _editorId: layer._leaflet_id };
    layer.feature = { ...feature, properties: { ...feature.properties } };
  });
  return collection;
}

export function recordSavedFeature(json, layer, dbId) {
  if (!json || !layer) return json;
  const collection = JSON.parse(json);
  const feature = collection.features.find(item => item.properties?._editorId === layer._leaflet_id);
  if (feature) feature.properties.dbId = dbId;
  return JSON.stringify(collection);
}

export async function persistMapDeletion(feature, actions, confirmDeletion) {
  if (!confirmDeletion()) return false;
  const { type, dbId } = feature.properties || {};
  if (dbId != null) {
    const remove = actions[type];
    if (!remove) throw new Error('Unsupported saved map item.');
    await remove(dbId);
  }
  return true;
}
