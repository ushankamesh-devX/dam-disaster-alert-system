import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    getDamById, getDamStatus, getDamGates, getDamHazardZones,
    updateDam, deleteDam, createGate, updateGate, deleteGate,
    getAllHazardLevelsList, createHazardZone, updateHazardZone, deleteHazardZone
} from '../../services/dam.service';
import { getSensorsByDam, createSensor, getSensorTypes } from '../../services/sensor.service';
import { getAllRegions } from '../../services/region.service';
import DamSensorChart from '../../components/dams/DamSensorChart';
import GeomanMap, { AREA_COLORS } from '../../components/map/GeomanMap';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hazardBg = {
    SAFE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    WATCH: 'bg-blue-50 text-blue-700 border-blue-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    DANGER: 'bg-orange-50 text-orange-700 border-orange-200',
    EXTREME_DANGER: 'bg-red-50 text-red-700 border-red-100',
};
function hColor(s = '') { return hazardBg[(s || '').toUpperCase()] || hazardBg.SAFE; }
function fmt(n) { return n != null ? Number(n).toFixed(1) : '—'; }

function Badge({ children, className }) {
    return <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md border ${className}`}>{children}</span>;
}
function InfoRow({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
            <span className="text-xs font-medium text-gray-800 text-right">{value || '—'}</span>
        </div>
    );
}
function Skeleton({ className }) { return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />; }
function Input({ label, error, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <input className={`w-full text-sm px-3 py-2 rounded-lg border ${error ? 'border-red-400' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`} {...props} />
            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
    );
}
function Select({ label, children, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" {...props}>
                {children}
            </select>
        </div>
    );
}

// ─── Edit Dam Modal ───────────────────────────────────────────────────────────

const DAM_STATUSES = ['operational', 'under_maintenance', 'decommissioned', 'under_construction'];
const RISK_CLASSES = ['low', 'medium', 'high', 'very_high', 'extreme'];

function EditDamModal({ dam, regions, onClose, onUpdated }) {
    const [form, setForm] = useState({
        name: dam.name || '',
        nameSi: dam.nameSi || '',
        locationDescription: dam.locationDescription || '',
        status: dam.status || '',
        riskClassification: dam.riskClassification || '',
        operatorOrganization: dam.operatorOrganization || '',
        contactPhone: dam.contactPhone || '',
        contactEmail: dam.contactEmail || '',
        emergencyPhone: dam.emergencyPhone || '',
        purpose: dam.purpose || '',
        regionId: dam.region?.id || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            if (payload.regionId) payload.regionId = Number(payload.regionId);
            const updated = await updateDam(dam.id, payload);
            toast.success('Dam updated');
            onUpdated(updated);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Edit Dam — {dam.code}</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <Input label="Name" value={form.name} onChange={e => set('name', e.target.value)} />
                    <Input label="Name (Sinhala)" value={form.nameSi} onChange={e => set('nameSi', e.target.value)} />
                    <Select label="Region" value={form.regionId} onChange={e => set('regionId', e.target.value)}>
                        <option value="">Select region…</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
                            {DAM_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </Select>
                        <Select label="Risk Classification" value={form.riskClassification} onChange={e => set('riskClassification', e.target.value)}>
                            {RISK_CLASSES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                        </Select>
                    </div>
                    <Input label="Purpose" value={form.purpose} onChange={e => set('purpose', e.target.value)} />
                    <Input label="Operator Organisation" value={form.operatorOrganization} onChange={e => set('operatorOrganization', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Contact Phone" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
                        <Input label="Emergency Phone" value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} />
                    </div>
                    <Input label="Contact Email" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
                    <Input label="Location Description" value={form.locationDescription} onChange={e => set('locationDescription', e.target.value)} />
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Gate Modal ───────────────────────────────────────────────────────────────

const GATE_TYPES = ['radial', 'slide', 'flap', 'drum', 'sector', 'overflow'];
const GATE_STATUSES = ['open', 'closed', 'partially_open', 'stuck', 'maintenance'];

function GateModal({ damId, gate, onClose, onSaved }) {
    const editing = !!gate;
    const [form, setForm] = useState({
        damId,
        gateNumber: gate?.gateNumber || '',
        gateType: gate?.gateType || 'radial',
        maxOpeningMeters: gate?.maxOpeningMeters || '',
        currentOpeningMeters: gate?.currentOpeningMeters || '',
        status: gate?.status || 'closed',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                maxOpeningMeters: Number(form.maxOpeningMeters),
                currentOpeningMeters: Number(form.currentOpeningMeters),
            };
            const saved = editing
                ? await updateGate(gate.id, payload)
                : await createGate(payload);
            toast.success(`Gate ${editing ? 'updated' : 'created'}`);
            onSaved(saved, editing);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Gate</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Gate Number" placeholder="G01" value={form.gateNumber} onChange={e => set('gateNumber', e.target.value)} />
                        <Select label="Gate Type" value={form.gateType} onChange={e => set('gateType', e.target.value)}>
                            {GATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Max Opening (m)" type="number" step="any" value={form.maxOpeningMeters} onChange={e => set('maxOpeningMeters', e.target.value)} />
                        <Input label="Current Opening (m)" type="number" step="any" value={form.currentOpeningMeters} onChange={e => set('currentOpeningMeters', e.target.value)} />
                    </div>
                    <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
                        {GATE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </Select>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
                            {saving ? 'Saving…' : editing ? 'Update' : 'Add Gate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Sensor Modal ─────────────────────────────────────────────────────────────

function SensorModal({ damId, initLat, initLng, sensorTypes, onClose, onSaved }) {
    const [form, setForm] = useState({
        damId,
        sensorUid: '',
        name: '',
        sensorTypeId: sensorTypes?.[0]?.id || '',
        latitude: initLat,
        longitude: initLng,
        status: 'active',
        minReading: 0,
        maxReading: 100,
        warningThreshold: 75,
        criticalThreshold: 90
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                sensorTypeId: Number(form.sensorTypeId),
                minReading: Number(form.minReading),
                maxReading: Number(form.maxReading),
                warningThreshold: Number(form.warningThreshold),
                criticalThreshold: Number(form.criticalThreshold)
            };
            const saved = await createSensor(payload);
            toast.success('Sensor created successfully on map');
            onSaved(saved);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create sensor');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Add Sensor at Dropped Location</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="bg-blue-50 text-blue-800 text-xs px-3 py-2 rounded-lg border border-blue-100">
                            <strong>Lat:</strong> {initLat.toFixed(5)}
                        </div>
                        <div className="bg-blue-50 text-blue-800 text-xs px-3 py-2 rounded-lg border border-blue-100">
                            <strong>Lng:</strong> {initLng.toFixed(5)}
                        </div>
                    </div>

                    <Input label="Sensor UID" placeholder="SENS-001" value={form.sensorUid} onChange={e => set('sensorUid', e.target.value)} required />
                    <Input label="Name" placeholder="Main Spillway Level" value={form.name} onChange={e => set('name', e.target.value)} required />

                    <Select label="Type" value={form.sensorTypeId} onChange={e => set('sensorTypeId', e.target.value)}>
                        {sensorTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>

                    <Select label="Initial Status" value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="inactive">Inactive</option>
                    </Select>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <Input label="Min Reading" type="number" step="any" value={form.minReading} onChange={e => set('minReading', e.target.value)} />
                        <Input label="Max Reading" type="number" step="any" value={form.maxReading} onChange={e => set('maxReading', e.target.value)} />
                        <Input label="Warning Thr." type="number" step="any" value={form.warningThreshold} onChange={e => set('warningThreshold', e.target.value)} />
                        <Input label="Critical Thr." type="number" step="any" value={form.criticalThreshold} onChange={e => set('criticalThreshold', e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving || !form.sensorUid || !form.name} className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
                            {saving ? 'Saving…' : 'Add Sensor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Hazard Zone Panel Component ──────────────────────────────────────────────

function HazardZonePanel({ damId, initGeoJson, initLayer, hazardLevels, onCancel, onSaved }) {
    const [form, setForm] = useState({
        damId,
        zoneCode: '',
        zoneName: '',
        hazardLevelId: hazardLevels?.[0]?.id || '',
        description: '',
        boundaryGeojson: initGeoJson,
        isActive: true
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                hazardLevelId: Number(form.hazardLevelId)
            };
            const saved = await createHazardZone(payload);
            onSaved(saved, initLayer);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create hazard zone');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col h-full bg-white flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 border-b pb-2">Create New Hazard Zone</h3>

            <div className="space-y-4">
                <Input label="Zone Code" placeholder="HZ-001" value={form.zoneCode} onChange={e => set('zoneCode', e.target.value)} required />
                <Input label="Name" placeholder="Downstream Flood Area" value={form.zoneName} onChange={e => set('zoneName', e.target.value)} required />

                <Select label="Hazard Level" value={form.hazardLevelId} onChange={e => set('hazardLevelId', e.target.value)}>
                    {hazardLevels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </Select>

                <Select label="Status" value={form.isActive} onChange={e => set('isActive', e.target.value === 'true')}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </Select>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                        rows={4}
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-auto pt-6 flex gap-3">
                <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                    Cancel
                </button>
                <button type="submit" disabled={saving || !form.zoneCode || !form.zoneName} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition shadow-sm">
                    {saving ? 'Saving…' : 'Save Zone'}
                </button>
            </div>
        </form>
    );
}

// ─── Water Level Bar ──────────────────────────────────────────────────────────

function WaterLevelBar({ pct, hazardStatus }) {
    const colors = {
        SAFE: 'bg-emerald-500',
        WATCH: 'bg-blue-500',
        WARNING: 'bg-amber-400',
        DANGER: 'bg-orange-500',
        EXTREME_DANGER: 'bg-red-600',
    };
    const safe = Math.min(Math.max(Number(pct) || 0, 0), 100);
    const color = colors[(hazardStatus || '').toUpperCase()] || 'bg-blue-500';
    return (
        <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Water Level</span>
                <span className="font-semibold text-gray-800">{safe.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${safe}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DamDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [dam, setDam] = useState(null);
    const [status, setStatus] = useState(null);
    const [gates, setGates] = useState([]);
    const [regions, setRegions] = useState([]);
    const [sensors, setSensors] = useState([]);
    const [sensorTypes, setSensorTypes] = useState([]);
    const [hazardZones, setHazardZones] = useState([]);
    const [hazardLevels, setHazardLevels] = useState([]);
    const [loading, setLoading] = useState(true);

    const [editOpen, setEditOpen] = useState(false);
    const [gateModal, setGateModal] = useState(null); // null | 'new' | gate object
    const [sensorModal, setSensorModal] = useState(null); // null | { lat, lng }
    const [hazardPanelState, setHazardPanelState] = useState(null); // null | { geojson, layer }
    const [deletingGate, setDeletingGate] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // overview | map | status | gates
    const [mapGeoJson, setMapGeoJson] = useState(null);
    const [activeColor, setActiveColor] = useState(AREA_COLORS[0]);
    const [rawMapOutput, setRawMapOutput] = useState(null);
    const [savingMap, setSavingMap] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [damRes, statusRes, gatesRes, sensorsRes, hazardRes, regionsRes, typesRes, hzLevelsRes] = await Promise.allSettled([
                    getDamById(id),
                    getDamStatus(id),
                    getDamGates(id),
                    getSensorsByDam(id),
                    getDamHazardZones(id),
                    getAllRegions(),
                    getSensorTypes(),
                    getAllHazardLevelsList()
                ]);

                let fetchedDam = null;
                let fetchedSensors = [];
                let fetchedHazardZones = [];

                if (damRes.status === 'fulfilled') { fetchedDam = damRes.value; setDam(fetchedDam); }
                if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
                if (gatesRes.status === 'fulfilled') setGates(gatesRes.value || []);
                if (sensorsRes.status === 'fulfilled') { fetchedSensors = sensorsRes.value || []; setSensors(fetchedSensors); }
                if (hazardRes.status === 'fulfilled') { fetchedHazardZones = hazardRes.value || []; setHazardZones(fetchedHazardZones); }
                if (regionsRes.status === 'fulfilled') setRegions(regionsRes.value || []);
                if (typesRes.status === 'fulfilled') setSensorTypes(typesRes.value || []);
                if (hzLevelsRes.status === 'fulfilled') setHazardLevels(hzLevelsRes.value || []);

                if (damRes.status !== 'fulfilled') {
                    toast.error('Dam not found'); navigate('/admin/dams');
                    return;
                }

                // Build initial GeoJSON for the Map
                buildDamGeoJson(fetchedDam, fetchedSensors, fetchedHazardZones);

            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [id]);

    const handleGateSaved = (saved, editing) => {
        if (editing) setGates(prev => prev.map(g => g.id === saved.id ? saved : g));
        else setGates(prev => [saved, ...prev]);
    };

    const handleGateDelete = async (gate) => {
        try {
            await deleteGate(gate.id);
            setGates(prev => prev.filter(g => g.id !== gate.id));
            toast.success(`Gate ${gate.gateNumber} deleted`);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Delete failed');
        }
        setDeletingGate(null);
    };

    // --- Map Utilities --------------------------------------------------------
    const buildDamGeoJson = (currentDam, currentSensors, currentHazards) => {
        if (!currentDam) return;
        const features = [];

        // 1. Dam Boundaries (Polygons)
        if (currentDam.damBoundaryGeojson) {
            try { features.push(...JSON.parse(currentDam.damBoundaryGeojson).features); } catch (e) { }
        }
        if (currentDam.reservoirBoundaryGeojson) {
            try { features.push(...JSON.parse(currentDam.reservoirBoundaryGeojson).features); } catch (e) { }
        }
        if (currentDam.downstreamRiverGeojson) {
            try { features.push(...JSON.parse(currentDam.downstreamRiverGeojson).features); } catch (e) { }
        }

        // 2. Hazard Zones (Polygons/Rectangles)
        currentHazards.forEach(hz => {
            if (hz.boundaryGeojson) {
                try {
                    const parsed = JSON.parse(hz.boundaryGeojson);
                    // Ensure the color property is mapped based on the hazard level if not inherently saved
                    parsed.features.forEach(f => {
                        f.properties = f.properties || {};
                        f.properties.type = hz.zoneType === 'rectangle' ? 'rectangle' : 'polygon';
                        f.properties.hazardZoneId = hz.id;
                    });
                    features.push(...parsed.features);
                } catch (e) { }
            }
        });

        // 3. Sensors (Points)
        currentSensors.forEach(s => {
            if (s.latitude && s.longitude) {
                features.push({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
                    properties: { type: "sensor", sensorId: s.id, name: s.name }
                });
            }
        });

        const collection = { type: "FeatureCollection", features };
        setMapGeoJson(JSON.stringify(collection));
    };

    const handleSensorModalClose = () => {
        if (sensorModal?.layer) sensorModal.layer.remove();
        setSensorModal(null);
    };

    const handleSensorSaved = (savedSensor) => {
        const updatedSensors = [...sensors, savedSensor];
        setSensors(updatedSensors);
        setSensorModal(null);
        toast.success("Refreshing map with new sensor...");
        buildDamGeoJson(dam, updatedSensors, hazardZones);
    };

    const handleShapeDrawn = (e) => {
        if ((e.type === 'Marker' || e.type === 'sensor' || !e.type) && e.latlng && !e.type?.includes("polygon") && !e.type?.includes("rectangle")) {
            setSensorModal({ lat: e.latlng.lat, lng: e.latlng.lng, layer: e.layer });
        } else if (e.type === 'polygon' || e.type === 'rectangle') {
            const geojsonObj = e.layer.toGeoJSON();
            const geoJsonString = JSON.stringify({ type: "FeatureCollection", features: [geojsonObj] });
            setHazardPanelState({ geojson: geoJsonString, layer: e.layer });
        }
    };

    const handleHazardPanelCancel = () => {
        if (hazardPanelState?.layer) hazardPanelState.layer.remove();
        setHazardPanelState(null);
    };

    const handleHazardSaved = (savedZone, layer) => {
        const updatedZones = [...hazardZones, savedZone];
        setHazardZones(updatedZones);
        setHazardPanelState(null);
        toast.success("Hazard Zone created and added to map!");
        buildDamGeoJson(dam, sensors, updatedZones);
    };

    const handleShapeEdited = async (layer) => {
        const feature = layer.feature;
        if (!feature || !feature.properties) return;

        // Try to identify if it's a hazard zone
        const hazardZoneId = feature.properties.hazardZoneId;

        if (hazardZoneId) {
            try {
                const geojsonObj = layer.toGeoJSON();
                const geoJsonString = JSON.stringify({ type: "FeatureCollection", features: [geojsonObj] });

                const existingZone = hazardZones.find(hz => hz.id === hazardZoneId);
                if (!existingZone) return;

                // We must send all required fields for UpdateHazardZoneRequest
                const payload = {
                    hazardLevelId: existingZone.hazardLevel?.id,
                    zoneCode: existingZone.zoneCode,
                    zoneName: existingZone.zoneName,
                    description: existingZone.description,
                    isActive: existingZone.isActive,
                    boundaryGeojson: geoJsonString
                };

                const updatedZone = await updateHazardZone(hazardZoneId, payload);

                setHazardZones(prev => prev.map(hz => hz.id === hazardZoneId ? updatedZone : hz));
                toast.success("Hazard Zone shape updated successfully");
            } catch (err) {
                toast.error("Failed to update Hazard Zone shape");
            }
        }
    };

    const handleShapeDeleted = async (layer) => {
        const feature = layer.feature;
        if (!feature || !feature.properties) return;

        const hazardZoneId = feature.properties.hazardZoneId;

        if (hazardZoneId) {
            try {
                await deleteHazardZone(hazardZoneId);
                setHazardZones(prev => prev.filter(hz => hz.id !== hazardZoneId));
                toast.success("Hazard Zone deleted successfully");
            } catch (err) {
                console.error("Failed to delete hazard zone. Context:", err);
                toast.error(`Failed to delete Hazard Zone: ${err?.response?.status} ${err?.response?.data?.message || err.message}`);
            }
        }
    };

    const handleSaveMap = async () => {
        if (!rawMapOutput) return;
        setSavingMap(true);
        try {
            const parsed = JSON.parse(rawMapOutput);

            // Extract ONLY boundaries (no sensors, no hazard zones by ID)
            const damBoundaries = parsed.features.filter(f => !['sensor', 'gate', 'hazard'].includes(f.properties?.type) && !f.properties?.hazardZoneId);

            const damCollection = { type: "FeatureCollection", features: damBoundaries };

            const updated = await updateDam(id, {
                damBoundaryGeojson: JSON.stringify(damCollection),
            });

            setDam(updated);
            toast.success("Dam boundaries saved safely. (Sensors and Hazard zones manage themselves instantly window by window)");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save map data");
        } finally {
            setSavingMap(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!dam) return null;

    const TABS = ['overview', 'map', 'status', 'gates', 'charts'];

    return (
        <div className="space-y-5">
            {/* Breadcrumb + Header */}
            <div>
                <button onClick={() => navigate('/admin/dams')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-2 transition">
                    ← Back to Dams
                </button>
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-bold text-gray-900">{dam.name}</h1>
                            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{dam.code}</span>
                            {status?.hazardStatus && <Badge className={hColor(status.hazardStatus)}>{status.hazardStatus}</Badge>}
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">{dam.region?.name ?? '—'} · {(dam.damType ?? '').replace('_', ' ')} dam</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setEditOpen(true)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >Edit Dam</button>
                    </div>
                </div>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Water Level', value: `${fmt(status?.waterLevelPercentage)}%`, sub: `${fmt(status?.waterLevelMeters)} m`, highlight: true },
                    { label: 'Storage', value: `${fmt(status?.storagePercentage)}%`, sub: `${fmt(status?.storageCurrentMcm)} MCM` },
                    { label: 'Inflow', value: `${fmt(status?.inflowCumecs)} m³/s`, sub: 'Current inflow' },
                    { label: 'Gates Open', value: `${status?.gatesOpenCount ?? '—'}/${status?.totalGatesCount ?? gates.length}`, sub: status?.spillwayGateStatus ?? 'Gate status' },
                ].map(({ label, value, sub, highlight }) => (
                    <div key={label} className={`rounded-xl p-4 border ${highlight ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200'} shadow-sm`}>
                        <p className={`text-xs mb-1 ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>{label}</p>
                        <p className={`text-xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{value}</p>
                        <p className={`text-xs mt-0.5 ${highlight ? 'text-blue-200' : 'text-gray-400'}`}>{sub}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-3 text-sm font-medium capitalize transition ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                        >{tab === 'charts' ? '📈 Charts' : tab === 'map' ? '🗺️ Map & Layout' : tab}</button>
                    ))}
                </div>

                {/* ── Overview Tab ─────────────────────────────────────────── */}
                {activeTab === 'overview' && (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Technical Details</h3>
                            <InfoRow label="Height" value={`${fmt(dam.heightMeters)} m`} />
                            <InfoRow label="Length" value={`${fmt(dam.lengthMeters)} m`} />
                            <InfoRow label="Reservoir Capacity" value={`${fmt(dam.reservoirCapacityMcm)} MCM`} />
                            <InfoRow label="Live Storage" value={`${fmt(dam.liveStorageMcm)} MCM`} />
                            <InfoRow label="Dead Storage" value={`${fmt(dam.deadStorageMcm)} MCM`} />
                            <InfoRow label="Catchment Area" value={`${fmt(dam.catchmentAreaSqkm)} km²`} />
                            <InfoRow label="Spillway Capacity" value={`${fmt(dam.spillwayCapacityCumecs)} cumecs`} />
                            <InfoRow label="River" value={dam.riverName} />
                            <InfoRow label="Year Completed" value={dam.yearCompleted} />
                            <InfoRow label="Purpose" value={dam.purpose} />
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact & Operations</h3>
                            <InfoRow label="Operator" value={dam.operatorOrganization} />
                            <InfoRow label="Contact Phone" value={dam.contactPhone} />
                            <InfoRow label="Emergency Phone" value={dam.emergencyPhone} />
                            <InfoRow label="Contact Email" value={dam.contactEmail} />
                            <InfoRow label="Location" value={dam.locationDescription} />
                            <InfoRow label="Coordinates" value={dam.latitude && dam.longitude ? `${dam.latitude}, ${dam.longitude}` : '—'} />
                            <InfoRow label="Status" value={(dam.status ?? '').replace('_', ' ')} />
                            <InfoRow label="Risk Classification" value={(dam.riskClassification ?? '').replace('_', ' ')} />
                            <InfoRow label="Last Inspection" value={dam.lastInspectionDate} />
                            <InfoRow label="Next Inspection" value={dam.nextInspectionDate} />
                        </div>
                    </div>
                )}

                {/* ── Map Tab ───────────────────────────────────────────── */}
                {activeTab === 'map' && (
                    <div className="flex h-[650px] bg-gray-50/50">
                        {/* Map Area */}
                        <div className="flex-1 relative isolate z-0 flex flex-col border-r border-gray-200">
                            {/* Map Toolbar / Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shadow-sm shrink-0 z-[400] absolute top-0 left-0 right-0">
                                <h3 className="text-sm font-semibold text-gray-800">Geospatial Layout</h3>
                                <button
                                    onClick={handleSaveMap}
                                    disabled={savingMap || !rawMapOutput}
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                                >
                                    {savingMap ? 'Saving Layout...' : '💾 Save Map Layout'}
                                </button>
                            </div>

                            {/* Map Component */}
                            <div className="flex-1 w-full relative z-0 mt-12">
                                <GeomanMap
                                    center={dam.latitude && dam.longitude ? [dam.latitude, dam.longitude] : [7.8731, 80.7718]}
                                    zoom={14}
                                    initialGeoJson={mapGeoJson}
                                    onMapChange={setRawMapOutput}
                                    onShapeDrawn={handleShapeDrawn}
                                    onShapeEdited={handleShapeEdited}
                                    onShapeDeleted={handleShapeDeleted}
                                    activeAreaColor={activeColor}
                                />
                            </div>
                        </div>

                        {/* Right Panel for Creation/Properties */}
                        <div className="w-80 flex flex-col bg-slate-50 relative z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
                            {hazardPanelState ? (
                                <HazardZonePanel
                                    damId={Number(id)}
                                    initGeoJson={hazardPanelState.geojson}
                                    initLayer={hazardPanelState.layer}
                                    hazardLevels={hazardLevels}
                                    onCancel={handleHazardPanelCancel}
                                    onSaved={handleHazardSaved}
                                />
                            ) : (
                                <div className="p-5 flex flex-col h-full text-center items-center justify-center text-gray-500">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                    </div>
                                    <h4 className="font-medium text-gray-800 mb-2">Hazard Zones</h4>
                                    <p className="text-sm mb-6 max-w-[200px]">Use the polygon tool on the map to define a new hazard zone.</p>

                                    <div className="bg-white p-4 rounded-xl border w-full text-left shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Drawing Color</p>
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            {AREA_COLORS.map(color => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => setActiveColor(color)}
                                                    title={color.name}
                                                    className={`w-8 h-8 rounded-full border-2 transition-transform ${activeColor.id === color.id ? 'scale-110 ring-4 ring-blue-500/30 ring-offset-1' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                                                    style={{ backgroundColor: color.fill, borderColor: color.border }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Status Tab ───────────────────────────────────────────── */}
                {activeTab === 'status' && (
                    <div className="p-5 space-y-5">
                        {!status ? (
                            <p className="text-sm text-gray-400 text-center py-12">No live status data available for this dam</p>
                        ) : (
                            <>
                                <WaterLevelBar pct={status.waterLevelPercentage} hazardStatus={status.hazardStatus} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hydraulics</h3>
                                        <InfoRow label="Water Level" value={`${fmt(status.waterLevelMeters)} m`} />
                                        <InfoRow label="Full Reservoir Level" value={`${fmt(status.fullReservoirLevelMeters)} m`} />
                                        <InfoRow label="Danger Level" value={`${fmt(status.dangerLevelMeters)} m`} />
                                        <InfoRow label="Inflow" value={`${fmt(status.inflowCumecs)} cumecs`} />
                                        <InfoRow label="Outflow" value={`${fmt(status.outflowCumecs)} cumecs`} />
                                        <InfoRow label="Storage" value={`${fmt(status.storageCurrentMcm)} MCM (${fmt(status.storagePercentage)}%)`} />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hazard & Weather</h3>
                                        <InfoRow label="Hazard Status" value={status.hazardStatus ?? 'SAFE'} />
                                        <InfoRow label="Flood Risk Score" value={status.floodRiskScore != null ? `${fmt(status.floodRiskScore)}/10` : '—'} />
                                        <InfoRow label="Rainfall (1hr)" value={`${fmt(status.rainfallLast1hrMm)} mm`} />
                                        <InfoRow label="Rainfall (24hr)" value={`${fmt(status.rainfallLast24hrMm)} mm`} />
                                        <InfoRow label="Forecast Rain (24hr)" value={`${fmt(status.rainfallForecast24hrMm)} mm`} />
                                        <InfoRow label="Last Sensor Reading" value={status.lastSensorReadingAt ? new Date(status.lastSensorReadingAt).toLocaleString() : '—'} />
                                        <InfoRow label="Last Updated" value={status.lastUpdated ? new Date(status.lastUpdated).toLocaleString() : '—'} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Gates Tab ────────────────────────────────────────────── */}
                {activeTab === 'gates' && (
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs text-gray-500">{gates.length} gates registered</p>
                            <button
                                onClick={() => setGateModal('new')}
                                className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                            >+ Add Gate</button>
                        </div>
                        {gates.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-sm text-gray-400">No gates registered</p>
                                <p className="text-xs text-gray-300 mt-1">Add gates using the button above</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                            {['Gate #', 'Type', 'Max Opening', 'Current Opening', 'Status', 'Last Operation', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {gates.map(gate => {
                                            const isOpen = (gate.status || '').toUpperCase() === 'OPEN' || (gate.status || '').toUpperCase() === 'PARTIALLY_OPEN';
                                            return (
                                                <tr key={gate.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 font-mono font-semibold text-xs text-gray-700">{gate.gateNumber}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-600 capitalize">{(gate.gateType ?? '').toLowerCase()}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">{fmt(gate.maxOpeningMeters)} m</td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">{fmt(gate.currentOpeningMeters)} m</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${isOpen ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                            {(gate.status ?? '').replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-400">
                                                        {gate.lastOperationAt ? new Date(gate.lastOperationAt).toLocaleString() : '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => setGateModal(gate)} className="text-xs text-blue-600 hover:underline">Edit</button>
                                                            <button onClick={() => setDeletingGate(gate)} className="text-xs text-red-500 hover:underline">Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Charts Tab ───────────────────────────────────────────── */}
                {activeTab === 'charts' && (
                    <DamSensorChart damId={Number(id)} />
                )}
            </div>

            {/* Modals */}
            {editOpen && (
                <EditDamModal
                    dam={dam}
                    regions={regions}
                    onClose={() => setEditOpen(false)}
                    onUpdated={(updated) => setDam(updated)}
                />
            )}
            {gateModal && (
                <GateModal
                    damId={Number(id)}
                    gate={gateModal === 'new' ? null : gateModal}
                    onClose={() => setGateModal(null)}
                    onSaved={handleGateSaved}
                />
            )}
            {sensorModal && (
                <SensorModal
                    damId={Number(id)}
                    initLat={sensorModal.lat}
                    initLng={sensorModal.lng}
                    sensorTypes={sensorTypes}
                    onClose={handleSensorModalClose}
                    onSaved={handleSensorSaved}
                />
            )}
            {deletingGate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h2 className="text-sm font-semibold text-gray-900 mb-2">Delete Gate {deletingGate.gateNumber}?</h2>
                        <p className="text-xs text-gray-500 mb-5">This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeletingGate(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                            <button onClick={() => handleGateDelete(deletingGate)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
