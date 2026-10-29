import SymbolIcon from '../../components/ui/SymbolIcon';
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { StatusChip as Badge, LoadingSkeleton as Skeleton, Field as Input, Field as Select, AppDialog, AppButton } from '../../components/ui/controls';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    getDamById, getDamStatus, getDamGates, getDamHazardZones,
    updateDam, deleteDam, createGate, updateGate, deleteGate,
} from '../../services/dam.service';
import { getSensorsByDam } from '../../services/sensor.service';
import { getAllRegionsList } from '../../services/region.service';
import DamSensorChart from '../../components/dams/DamSensorChart';
import DamForecastWidget from '../../components/dams/DamForecastWidget';
import GeomanMap from '../../components/map/GeomanMap';
import VictoriaReferenceNotice from '../../components/map/VictoriaReference';
import { referenceMapFeatures, victoriaReference, isVictoriaDemo } from '../../components/map/victoriaGeography';

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


function InfoRow({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
            <span className="text-xs font-medium text-gray-800 text-right">{value || '—'}</span>
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
        latitude: dam.latitude || '',
        longitude: dam.longitude || '',
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
            if (payload.latitude !== '') payload.latitude = Number(payload.latitude); else delete payload.latitude;
            if (payload.longitude !== '') payload.longitude = Number(payload.longitude); else delete payload.longitude;
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
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-base font-semibold text-gray-900">Edit Dam — {dam.code}</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <Input label="Name" value={form.name} onChange={e => set('name', e.target.value)} />
                    <Input label="Name (Sinhala)" value={form.nameSi} onChange={e => set('nameSi', e.target.value)} />
                    <Select label="Region" value={form.regionId} onChange={e => set('regionId', e.target.value)}>
                        <option value="">Select region…</option>
                        {(regions || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Latitude" type="number" step="any" placeholder="7.2276" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
                        <Input label="Longitude" type="number" step="any" placeholder="80.7867" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
                    </div>
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
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" type="submit" disabled={saving} className="disabled:opacity-60">
                            {saving ? 'Saving…' : 'Save Changes'}
                        </AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Gate Modal ───────────────────────────────────────────────────────────────

const GATE_TYPES = ['radial', 'slide', 'flap', 'drum', 'sector', 'overflow'];
const GATE_STATUSES = ['open', 'closed', 'partially_open', 'stuck', 'maintenance'];

function GateModal({ damId, damName, gate, onClose, onSaved }) {
    const editing = !!gate;
    const [form, setForm] = useState(() => {
        let gateNumber = gate?.gateNumber || '';
        if (!gate) {
            const initials = (damName || '').split(' ').filter(Boolean).map(w => w[0].toUpperCase()).join('');
            gateNumber = `${initials}-G${Math.floor(100 + Math.random() * 900)}`;
        }
        return {
            damId,
            gateNumber,
            gateType: gate?.gateType || 'radial',
            maxOpeningMeters: gate?.maxOpeningMeters || '',
            currentOpeningMeters: gate?.currentOpeningMeters || '',
            status: gate?.status || 'closed',
        };
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
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-sm font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Gate</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
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
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" type="submit" disabled={saving} className="disabled:opacity-60">
                            {saving ? 'Saving…' : editing ? 'Update' : 'Add Gate'}
                        </AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
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
    const [hazardZones, setHazardZones] = useState([]);
    const [loading, setLoading] = useState(true);

    const [editOpen, setEditOpen] = useState(false);
    const [gateModal, setGateModal] = useState(null); // null | 'new' | gate object
    const [deletingGate, setDeletingGate] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // overview | status | gates | charts

    // Build read-only GeoJSON for the map overview from fetched data
    const mapGeoJson = useMemo(() => {
        const features = [];
        hazardZones.forEach(zone => {
            if (zone.boundaryGeojson) {
                try {
                    const geometry = typeof zone.boundaryGeojson === 'string' ? JSON.parse(zone.boundaryGeojson) : zone.boundaryGeojson;
                    features.push({
                        type: 'Feature', geometry,
                        properties: {
                            type: geometry.type === 'Polygon' ? 'polygon' : 'rectangle',
                            dbId: zone.id, zoneName: zone.zoneName, zoneCode: zone.zoneCode,
                            description: zone.description, hazardLevelId: zone.hazardLevel?.id,
                            fillColor: zone.fillColor || '#fca5a5', fillOpacity: zone.fillOpacity || 0.4,
                            strokeColor: zone.strokeColor || '#ef4444', strokeWidth: zone.strokeWidth || 2,
                        },
                    });
                } catch (e) { }
            }
        });
        gates.forEach(gate => {
            if (gate.latitude && gate.longitude) {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [parseFloat(gate.longitude), parseFloat(gate.latitude)] },
                    properties: { type: 'gateCircle', dbId: gate.id, gateNumber: gate.gateNumber },
                });
            }
        });
        sensors.forEach(sensor => {
            if (sensor.latitude && sensor.longitude) {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [sensor.longitude, sensor.latitude] },
                    properties: { type: 'sensorCircle', dbId: sensor.id, name: sensor.name, sensorUid: sensor.sensorUid },
                });
            }
        });
        const mapFeatures = referenceMapFeatures(dam, features);
        if (mapFeatures.length === 0) return null;
        return JSON.stringify({ type: 'FeatureCollection', features: mapFeatures });
    }, [dam, hazardZones, gates, sensors]);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [damRes, statusRes, gatesRes, sensorsRes, hazardRes, regionsRes] = await Promise.allSettled([
                    getDamById(id),
                    getDamStatus(id),
                    getDamGates(id),
                    getSensorsByDam(id),
                    getDamHazardZones(id),
                    getAllRegionsList(),
                ]);

                if (damRes.status === 'fulfilled') setDam(damRes.value);
                if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
                if (gatesRes.status === 'fulfilled') setGates(gatesRes.value || []);
                if (sensorsRes.status === 'fulfilled') setSensors(sensorsRes.value || []);
                if (hazardRes.status === 'fulfilled') setHazardZones(hazardRes.value || []);
                if (regionsRes.status === 'fulfilled') setRegions(regionsRes.value || []);

                if (damRes.status !== 'fulfilled') {
                    toast.error('Dam not found'); navigate('/admin/dams');
                    return;
                }

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

    const TABS = ['overview', 'status', 'gates', 'charts', 'forecasts'];

    return (
        <div className="space-y-5">
            {/* Breadcrumb + Header */}
            <div>
                <AppButton onClick={() => navigate('/admin/dams')} className="flex items-center gap-1 mb-2">
                    ← Back to Dams
                </AppButton>
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <Typography component="h1" variant="h1" className="text-xl font-bold text-gray-900">{dam.name}</Typography>
                            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{dam.code}</span>
                            {status?.hazardStatus && <Badge className={hColor(status.hazardStatus)}>{status.hazardStatus}</Badge>}
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">{dam.region?.name ?? '—'} · {(dam.damType ?? '').replace('_', ' ')} dam</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AppButton variant="outlined"
                            onClick={() => navigate(`/admin/dams/${id}/map`)}
                            className="flex items-center gap-1.5"
                        ><SymbolIcon name="map" /> Map & Layout</AppButton>
                        <AppButton variant="outlined"
                            onClick={() => setEditOpen(true)}
                            className=""
                        >Edit Dam</AppButton>
                    </div>
                </div>
            </div>

            {/* Full-width Map Overview */}
            <Paper variant="outlined" className="w-full bg-white  border border-gray-200  overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700"><SymbolIcon name="map" /> Map & Layout Overview</span>
                    <AppButton
                        onClick={() => navigate(`/admin/dams/${id}/map`)}
                        className=""
                    >Edit in full map →</AppButton>
                </div>
                <VictoriaReferenceNotice dam={dam} />
                <div className="h-64 w-full isolate relative z-0">
                    {mapGeoJson ? (
                        <GeomanMap
                            key={mapGeoJson}
                            readOnly
                            initialGeoJson={mapGeoJson}
                            height="100%"
                            referenceGeoJson={victoriaReference(dam)}
                            safeLocationDamId={dam.id}
                            fitBoundsOnLoad={!isVictoriaDemo(dam)}
                            onMapChange={() => { }}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm gap-2">
                            <span>No map data yet.</span>
                            <AppButton onClick={() => navigate(`/admin/dams/${id}/map`)} className="hover:underline">Add in Map Editor →</AppButton>
                        </div>
                    )}
                </div>
            </Paper>

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
            <Paper variant="outlined" className="bg-white border border-gray-200   overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {TABS.map(tab => (
                        <AppButton
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-3 text-sm font-medium capitalize transition ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                        >{tab === 'charts' ? 'Charts' : tab === 'forecasts' ? 'AI Forecasts' : tab}</AppButton>
                    ))}
                </div>

                {/* ── Overview Tab ─────────────────────────────────────────── */}
                {activeTab === 'overview' && (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Technical Details</Typography>
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
                            <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact & Operations</Typography>
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
                                        <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hydraulics</Typography>
                                        <InfoRow label="Water Level" value={`${fmt(status.waterLevelMeters)} m`} />
                                        <InfoRow label="Full Reservoir Level" value={`${fmt(status.fullReservoirLevelMeters)} m`} />
                                        <InfoRow label="Danger Level" value={`${fmt(status.dangerLevelMeters)} m`} />
                                        <InfoRow label="Inflow" value={`${fmt(status.inflowCumecs)} cumecs`} />
                                        <InfoRow label="Outflow" value={`${fmt(status.outflowCumecs)} cumecs`} />
                                        <InfoRow label="Storage" value={`${fmt(status.storageCurrentMcm)} MCM (${fmt(status.storagePercentage)}%)`} />
                                    </div>
                                    <div className="space-y-3">
                                        <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hazard & Weather</Typography>
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
                            <AppButton variant="contained"
                                onClick={() => setGateModal('new')}
                                className="flex items-center gap-1.5"
                            >+ Add Gate</AppButton>
                        </div>
                        {gates.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-sm text-gray-400">No gates registered</p>
                                <p className="text-xs text-gray-300 mt-1">Add gates using the button above</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full text-sm">
                                    <TableHead>
                                        <TableRow className="bg-gray-50 border-b border-gray-100 text-left">
                                            {['Gate #', 'Type', 'Max Opening', 'Current Opening', 'Status', 'Last Operation', 'Actions'].map(h => (
                                                <TableCell component="th" key={h} className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody className="divide-y divide-gray-50">
                                        {gates.map(gate => {
                                            const isOpen = (gate.status || '').toUpperCase() === 'OPEN' || (gate.status || '').toUpperCase() === 'PARTIALLY_OPEN';
                                            return (
                                                <TableRow key={gate.id} className="hover:bg-gray-50/50">
                                                    <TableCell className="px-4 py-3 font-mono font-semibold text-xs text-gray-700">{gate.gateNumber}</TableCell>
                                                    <TableCell className="px-4 py-3 text-xs text-gray-600 capitalize">{(gate.gateType ?? '').toLowerCase()}</TableCell>
                                                    <TableCell className="px-4 py-3 text-xs text-gray-600">{fmt(gate.maxOpeningMeters)} m</TableCell>
                                                    <TableCell className="px-4 py-3 text-xs text-gray-600">{fmt(gate.currentOpeningMeters)} m</TableCell>
                                                    <TableCell className="px-4 py-3">
                                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${isOpen ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                            {(gate.status ?? '').replace('_', ' ')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-xs text-gray-400">
                                                        {gate.lastOperationAt ? new Date(gate.lastOperationAt).toLocaleString() : '—'}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <AppButton onClick={() => setGateModal(gate)} className="hover:underline">Edit</AppButton>
                                                            <AppButton onClick={() => setDeletingGate(gate)} className="hover:underline">Delete</AppButton>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Charts Tab ───────────────────────────────────────────── */}
                {activeTab === 'charts' && (
                    <DamSensorChart damId={Number(id)} />
                )}

                {/* ── AI Forecasts Tab ─────────────────────────────────────── */}
                {activeTab === 'forecasts' && (
                    <div className="p-6">
                        <DamForecastWidget damId={Number(id)} dam={dam} />
                    </div>
                )}
            </Paper>

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
                    damName={dam.name}
                    gate={gateModal === 'new' ? null : gateModal}
                    onClose={() => setGateModal(null)}
                    onSaved={handleGateSaved}
                />
            )}

            {deletingGate && (
                <AppDialog onClose={() => setDeletingGate(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <Typography component="h2" variant="h2" className="text-sm font-semibold text-gray-900 mb-2">Delete Gate {deletingGate.gateNumber}?</Typography>
                        <p className="text-xs text-gray-500 mb-5">This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <AppButton onClick={() => setDeletingGate(null)} className="">Cancel</AppButton>
                            <AppButton variant="contained" color="error" onClick={() => handleGateDelete(deletingGate)} className="">Delete</AppButton>
                        </div>
                    </div>
                </AppDialog>
            )}
        </div>
    );
}
