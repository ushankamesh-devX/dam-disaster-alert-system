import React, { useMemo, useState } from 'react';
import { MapPin, Palette, Settings2 } from 'lucide-react';
import SystemSafeLocationsGeomanMap from '../../components/map/SystemSafeLocationsGeomanMap';
import { patchSafeLocationFromForm } from '../../components/map/systemSafeLocationsFormPatch';

const PIN_PRESETS = {
    evacuation_center: { label: 'Evacuation Center', marker_icon: 'evacuation_center', marker_color: '#2563eb' },
    police_station: { label: 'Police Station', marker_icon: 'police_station', marker_color: '#1e40af' },
    hospital: { label: 'Hospital', marker_icon: 'hospital', marker_color: '#ef4444' },
    fire_station: { label: 'Fire Station', marker_icon: 'fire_station', marker_color: '#f97316' },
    clinic: { label: 'Clinic', marker_icon: 'clinic', marker_color: '#dc2626' },
    school: { label: 'School', marker_icon: 'school', marker_color: '#7c3aed' },
    community_hall: { label: 'Community Hall', marker_icon: 'community_hall', marker_color: '#0ea5e9' },
    temple: { label: 'Temple', marker_icon: 'temple', marker_color: '#f59e0b' },
    mosque: { label: 'Mosque', marker_icon: 'mosque', marker_color: '#059669' },
    safe_zone: { label: 'Safe Zone', marker_icon: 'safe_zone', marker_color: '#16a34a' },
    other: { label: 'Other (custom)', marker_icon: 'other', marker_color: '#2563eb' },
};

const BASE_ICON_OPTIONS = [
    { value: 'none', label: 'None (default marker)' },
    { value: 'evacuation_center', label: 'Evacuation Center' },
    { value: 'police_station', label: 'Police Station' },
    { value: 'hospital', label: 'Hospital' },
    { value: 'fire_station', label: 'Fire Station' },
    { value: 'clinic', label: 'Clinic' },
    { value: 'school', label: 'School' },
    { value: 'community_hall', label: 'Community Hall' },
    { value: 'temple', label: 'Temple' },
    { value: 'mosque', label: 'Mosque' },
    { value: 'safe_zone', label: 'Safe Zone' },
    { value: 'other', label: 'Generic (default)' },
];

const CUSTOM_ICON_OPTIONS = [
    { value: 'auto', label: 'Auto (pick unused icon)' },
    ...BASE_ICON_OPTIONS,
];

function pickUnusedIcon(usedIcons) {
    const candidates = [
        'police_station',
        'hospital',
        'fire_station',
        'clinic',
        'school',
        'community_hall',
        'temple',
        'mosque',
        'safe_zone',
        'evacuation_center',
        'other',
    ];
    for (const c of candidates) {
        if (!usedIcons.has(c)) return c;
    }
    return 'other';
}

function safeKeyFromLabel(label) {
    return String(label || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
}

function defaultPrefixFromLabel(label) {
    const cleaned = String(label || '')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]+/g, ' ')
        .trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const first = parts[0] || 'LOC';
    return first.slice(0, 3) || 'LOC';
}

const COLOR_SWATCHES = [
    '#2563eb', '#1e40af', '#7c3aed', '#0ea5e9', '#059669', '#16a34a', '#f59e0b', '#f97316', '#ef4444', '#dc2626',
];

function stripInternal(props) {
    if (!props || typeof props !== 'object') return props;
    const { __entity: _internalEntity, ...rest } = props;
    return rest;
}

function safeParseJson(text) {
    try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { ok: false, error: 'JSON must be an object (e.g. {"name":"..."}).' };
        }
        return { ok: true, value: parsed };
    } catch (err) {
        return { ok: false, error: err?.message || 'Invalid JSON' };
    }
}

export default function SystemSafeLocationsMapFuncPage() {
    const [locations, setLocations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [newPinPreset, setNewPinPreset] = useState('evacuation_center');
    const [newPinColor, setNewPinColor] = useState(PIN_PRESETS.evacuation_center.marker_color);
    const [newOtherIcon, setNewOtherIcon] = useState('other');
    const [customTypes, setCustomTypes] = useState([]);
    const [customTypeLabel, setCustomTypeLabel] = useState('');
    const [customTypeIcon, setCustomTypeIcon] = useState('auto');
    const [customTypeColor, setCustomTypeColor] = useState('#2563eb');
    const [jsonText, setJsonText] = useState('');
    const [jsonError, setJsonError] = useState(null);
    const [pendingChanges, setPendingChanges] = useState(false);
    const [form, setForm] = useState({
        code: '',
        name: '',
        description: '',
        status: 'active',
        location_type_id: '',
        region_id: '',
        address_text: '',
        elevation_meters: '',
        contact_phone: '',
        emergency_phone: '',
        contact_name: '',
        contact_email: '',
        capacity_persons: '',
        current_occupancy: '',
        marker_icon: 'evacuation_center',
        marker_color: '#2563eb',
        show_on_map: true,
        is_24_hours: false,
        is_verified: false,
        has_medical_facility: false,
        has_food_supply: false,
        has_water_supply: false,
        has_power_backup: false,
        has_communication: false,
        has_restrooms: false,
        has_pet_area: false,
        has_accessibility: false,
    });

    const outputJson = useMemo(() => {
        return JSON.stringify(
            {
                entity: 'system_safe_locations',
                mode: 'test',
                count: locations.length,
                items: locations,
            },
            null,
            2
        );
    }, [locations]);

    const handleSelectedChange = (props) => {
        setSelected(props);
        if (!props) return;

        const clean = stripInternal(props);
        setJsonText(JSON.stringify(clean, null, 2));
        setJsonError(null);
        setPendingChanges(false);

        setForm((prev) => ({
            ...prev,
            code: props.code || '',
            name: props.name || '',
            description: props.description || '',
            status: props.status || 'active',
            location_type_id: props.location_type_id ?? '',
            region_id: props.region_id ?? '',
            address_text: props.address_text || '',
            elevation_meters: props.elevation_meters ?? '',
            contact_phone: props.contact_phone || '',
            emergency_phone: props.emergency_phone || '',
            contact_name: props.contact_name || '',
            contact_email: props.contact_email || '',
            capacity_persons: props.capacity_persons ?? '',
            current_occupancy: props.current_occupancy ?? '',
            marker_icon: props.marker_icon || 'evacuation_center',
            marker_color: props.marker_color || '#2563eb',
            show_on_map: props.show_on_map ?? true,
            is_24_hours: props.is_24_hours ?? false,
            is_verified: props.is_verified ?? false,
            has_medical_facility: props.has_medical_facility ?? false,
            has_food_supply: props.has_food_supply ?? false,
            has_water_supply: props.has_water_supply ?? false,
            has_power_backup: props.has_power_backup ?? false,
            has_communication: props.has_communication ?? false,
            has_restrooms: props.has_restrooms ?? false,
            has_pet_area: props.has_pet_area ?? false,
            has_accessibility: props.has_accessibility ?? false,
        }));
    };

    const applyFormToSelected = () => {
        if (!selected) return;
        const patch = patchSafeLocationFromForm(form);
        if (window.__DDAS_SAFE_LOCATIONS__?.updateSelectedLocation) {
            window.__DDAS_SAFE_LOCATIONS__.updateSelectedLocation(patch);
        }
        setPendingChanges(false);
    };

    const applyJsonToSelected = () => {
        if (!selected) return;
        const parsed = safeParseJson(jsonText);
        if (!parsed.ok) {
            setJsonError(parsed.error);
            return;
        }
        setJsonError(null);

        // Prevent accidental edits of identity / coordinates from the editor.
        // Lat/Lng are controlled by the marker position.
        const {
            uuid: _uuid,
            latitude: _latitude,
            longitude: _longitude,
            created_at: _createdAt,
            updated_at: _updatedAt,
            deleted_at: _deletedAt,
            ...patch
        } = parsed.value;

        if (window.__DDAS_SAFE_LOCATIONS__?.updateSelectedLocation) {
            window.__DDAS_SAFE_LOCATIONS__.updateSelectedLocation(patch);
        }
        setPendingChanges(false);
    };

    const pinTypeOptions = useMemo(() => {
        const builtins = Object.entries(PIN_PRESETS).map(([key, v]) => ({ key, ...v, kind: 'builtin' }));
        const customs = customTypes.map((t) => ({
            key: t.key,
            label: t.label,
            marker_icon: t.marker_icon,
            marker_color: t.marker_color,
            code_prefix: t.code_prefix,
            kind: 'custom',
        }));
        return [...builtins, ...customs];
    }, [customTypes]);

    const selectedNewType = useMemo(() => {
        return pinTypeOptions.find((o) => o.key === newPinPreset) || null;
    }, [pinTypeOptions, newPinPreset]);

    const newLocationTemplate = useMemo(() => {
        const preset = selectedNewType || PIN_PRESETS.evacuation_center;
        const icon = newPinPreset === 'other' ? newOtherIcon : preset.marker_icon;

        const iconLabel = BASE_ICON_OPTIONS.find((o) => o.value === icon)?.label || 'Location';
        const templateLabel = newPinPreset === 'other' ? iconLabel : preset.label;
        const templatePrefix = preset.code_prefix || defaultPrefixFromLabel(templateLabel);

        return {
            marker_icon: icon,
            marker_color: newPinColor || preset.marker_color,
            __templateLabel: templateLabel,
            __templateCodePrefix: templatePrefix,
        };
    }, [newPinPreset, newPinColor, newOtherIcon, selectedNewType]);

    const addCustomType = () => {
        const label = customTypeLabel.trim();
        if (!label) return;

        const usedIcons = new Set([
            ...Object.values(PIN_PRESETS).map((p) => p.marker_icon),
            ...customTypes.map((t) => t.marker_icon),
        ]);

        const resolvedIcon = customTypeIcon === 'auto' ? pickUnusedIcon(usedIcons) : customTypeIcon;

        const baseKey = safeKeyFromLabel(label) || 'custom';
        const key = `custom_${baseKey}_${Date.now()}`;
        const next = {
            key,
            label,
            marker_icon: resolvedIcon,
            marker_color: customTypeColor,
            code_prefix: defaultPrefixFromLabel(label),
        };
        setCustomTypes((prev) => [...prev, next]);
        setCustomTypeLabel('');
        setCustomTypeIcon('auto');
        setNewPinPreset(key);
        setNewPinColor(customTypeColor);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] gap-6">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3">
                        System Safe Locations Test
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 pl-4 flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Data-entry friendly pins • Choose type/color • Hover shows details • Create/edit/drag/delete
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col min-h-[500px]">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        Safe Location Pins
                    </h2>

                    <div className="mb-3 flex flex-wrap items-center gap-3">
                        <label className="text-xs text-gray-700 flex items-center gap-2">
                            New pin type
                            <select
                                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                value={newPinPreset}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    setNewPinPreset(next);
                                    const preset = pinTypeOptions.find((o) => o.key === next) || PIN_PRESETS.evacuation_center;
                                    setNewPinColor(preset.marker_color);
                                    if (next !== 'other') {
                                        setNewOtherIcon('other');
                                    }
                                }}
                            >
                                {pinTypeOptions.map((o) => (
                                    <option key={o.key} value={o.key}>{o.label}</option>
                                ))}
                            </select>
                        </label>

                        {newPinPreset === 'other' ? (
                            <label className="text-xs text-gray-700 flex items-center gap-2">
                                Default icon
                                <select
                                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                    value={newOtherIcon}
                                    onChange={(e) => setNewOtherIcon(e.target.value)}
                                >
                                    {BASE_ICON_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </label>
                        ) : null}

                        <div className="flex flex-wrap items-end gap-2">
                            <div className="text-xs text-gray-600">Add new type (custom)</div>
                            <input
                                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                value={customTypeLabel}
                                onChange={(e) => setCustomTypeLabel(e.target.value)}
                                placeholder="e.g. Relief Camp / Bus Stop"
                            />
                            <select
                                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                value={customTypeIcon}
                                onChange={(e) => setCustomTypeIcon(e.target.value)}
                                title="Default icon"
                            >
                                {CUSTOM_ICON_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <input
                                type="color"
                                className="h-9 w-10 rounded border border-gray-300 bg-white"
                                value={customTypeColor}
                                onChange={(e) => setCustomTypeColor(e.target.value)}
                                title="Default color"
                            />
                            <button
                                type="button"
                                className="text-xs font-semibold px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                                onClick={addCustomType}
                                disabled={!customTypeLabel.trim()}
                                title="Add this type to the dropdown"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <Palette className="w-4 h-4 text-gray-400" />
                            {COLOR_SWATCHES.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`w-5 h-5 rounded-full border ${newPinColor === c ? 'border-gray-900' : 'border-gray-300'}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => {
                                        setNewPinColor(c);
                                    }}
                                    title={c}
                                />
                            ))}
                        </div>
                        <div className="text-xs text-gray-500">
                            Select type, then place a marker using the toolbar.
                        </div>
                    </div>

                    <div className="flex-1 w-full rounded border border-gray-300 overflow-hidden isolate relative z-0">
                        <SystemSafeLocationsGeomanMap
                            onLocationsChange={setLocations}
                            onSelectedLocationChange={handleSelectedChange}
                            newLocationTemplate={newLocationTemplate}
                            height="100%"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col p-4 overflow-hidden min-h-0">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 shrink-0">Location Details + Output</h2>

                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                            {selected ? (
                                <div className="space-y-3">
                                    <div className="sticky top-0 bg-gray-50 pb-2">
                                        <div className="text-xs text-gray-600">
                                            Selected: <span className="font-mono">{selected.uuid}</span>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={applyFormToSelected}
                                                disabled={!pendingChanges}
                                                className={`text-xs font-semibold px-2.5 py-1.5 rounded border transition-colors ${pendingChanges
                                                    ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                Save changes
                                            </button>
                                            <div className="text-[11px] text-gray-500">
                                                Fill fields then click Save. Drag the pin to change location.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                    <label className="text-xs text-gray-700">
                                        Pin icon
                                        <select
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.marker_icon}
                                            onChange={(e) => {
                                                const nextIcon = e.target.value;
                                                const preset = PIN_PRESETS[nextIcon] || null;
                                                setForm((p) => ({
                                                    ...p,
                                                    marker_icon: nextIcon,
                                                    marker_color: preset?.marker_color ?? p.marker_color,
                                                }));
                                                setPendingChanges(true);
                                            }}
                                        >
                                            {BASE_ICON_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="text-xs text-gray-700">
                                        Pin color (hex)
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-mono"
                                            value={form.marker_color}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, marker_color: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>

                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-700 flex-1">
                                            Pick color
                                            <input
                                                type="color"
                                                className="mt-1 w-full h-9 rounded border border-gray-300 bg-white"
                                                value={form.marker_color}
                                                onChange={(e) => {
                                                    setForm((p) => ({ ...p, marker_color: e.target.value }));
                                                    setPendingChanges(true);
                                                }}
                                            />
                                        </label>
                                        <div className="pt-5 flex items-center gap-1.5">
                                            {COLOR_SWATCHES.slice(0, 8).map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    className="w-5 h-5 rounded-full border border-gray-300"
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => {
                                                        setForm((p) => ({ ...p, marker_color: c }));
                                                        setPendingChanges(true);
                                                    }}
                                                    title={c}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <label className="text-xs text-gray-700">
                                        Code
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.code}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, code: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Name
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.name}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, name: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Description
                                        <textarea
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            rows={2}
                                            value={form.description}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, description: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Status
                                        <select
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.status}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, status: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        >
                                            <option value="active">active</option>
                                            <option value="inactive">inactive</option>
                                            <option value="under_maintenance">under_maintenance</option>
                                            <option value="full">full</option>
                                            <option value="closed">closed</option>
                                        </select>
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Location type ID (from DB)
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.location_type_id}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, location_type_id: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                            placeholder="e.g. 10"
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Region ID (optional)
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.region_id}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, region_id: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                            placeholder="e.g. 3"
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Capacity (persons)
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.capacity_persons}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, capacity_persons: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Current occupancy
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.current_occupancy}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, current_occupancy: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Emergency phone
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.emergency_phone}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, emergency_phone: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Address
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.address_text}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, address_text: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Elevation (meters)
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.elevation_meters}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, elevation_meters: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Contact name
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.contact_name}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, contact_name: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Contact phone
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.contact_phone}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, contact_phone: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        Contact email
                                        <input
                                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                            value={form.contact_email}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, contact_email: e.target.value }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={form.show_on_map}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, show_on_map: e.target.checked }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                        Show on map
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={form.is_24_hours}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, is_24_hours: e.target.checked }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                        24 hours
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={form.is_verified}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, is_verified: e.target.checked }));
                                                setPendingChanges(true);
                                            }}
                                        />
                                        Verified
                                    </label>
                                </div>

                                <details className="pt-2 border-t border-gray-200">
                                    <summary className="cursor-pointer text-xs font-semibold text-gray-700 select-none">
                                        Advanced (optional): paste/edit all fields
                                    </summary>
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-xs text-gray-600">All Fields (JSON)</div>
                                            <button
                                                type="button"
                                                onClick={applyJsonToSelected}
                                                className="text-xs font-semibold px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                                            >
                                                Apply JSON
                                            </button>
                                        </div>
                                        <textarea
                                            className="w-full h-44 rounded border border-gray-300 bg-white p-2 font-mono text-xs text-gray-800"
                                            value={jsonText}
                                            onChange={(e) => {
                                                setJsonText(e.target.value);
                                                setPendingChanges(true);
                                            }}
                                            spellCheck={false}
                                        />
                                        {jsonError ? (
                                            <div className="mt-1 text-xs text-red-600">{jsonError}</div>
                                        ) : (
                                            <div className="mt-1 text-[11px] text-gray-500">
                                                Paste complex fields like `amenities`, `operating_hours`, `boundary_geojson`, `gallery_urls`, `serves_hazard_zones`.
                                            </div>
                                        )}
                                    </div>
                                </details>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500">
                                    Create a pin (marker tool) then click it to edit details.
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-700 border border-gray-200">
                            {locations.length ? (
                                <pre className="whitespace-pre-wrap">{outputJson}</pre>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-gray-400 italic text-center">
                                    Use the marker tool on the left to add evacuation centers. Drag/edit/delete to test updates.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
