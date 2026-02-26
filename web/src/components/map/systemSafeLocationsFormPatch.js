function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeStatus(status) {
  const allowed = new Set(['active', 'inactive', 'under_maintenance', 'full', 'closed']);
  return allowed.has(status) ? status : 'active';
}

export function patchSafeLocationFromForm(formState) {
  return {
    code: formState.code || null,
    name: formState.name || null,
    description: formState.description || null,

    location_type_id: toNumberOrNull(formState.location_type_id),
    region_id: toNumberOrNull(formState.region_id),

    status: normalizeStatus(formState.status),
    address_text: formState.address_text || null,

    elevation_meters: toNumberOrNull(formState.elevation_meters),
    marker_icon: formState.marker_icon || null,
    marker_color: formState.marker_color || null,

    contact_name: formState.contact_name || null,
    contact_phone: formState.contact_phone || null,
    contact_email: formState.contact_email || null,
    emergency_phone: formState.emergency_phone || null,
    capacity_persons: toNumberOrNull(formState.capacity_persons),
    current_occupancy: toNumberOrNull(formState.current_occupancy),

    show_on_map: Boolean(formState.show_on_map),
    is_24_hours: Boolean(formState.is_24_hours),
    is_verified: Boolean(formState.is_verified),
    has_medical_facility: Boolean(formState.has_medical_facility),
    has_food_supply: Boolean(formState.has_food_supply),
    has_water_supply: Boolean(formState.has_water_supply),
    has_power_backup: Boolean(formState.has_power_backup),
    has_communication: Boolean(formState.has_communication),
    has_restrooms: Boolean(formState.has_restrooms),
    has_pet_area: Boolean(formState.has_pet_area),
    has_accessibility: Boolean(formState.has_accessibility),
  };
}
