import SymbolIcon from '../../components/ui/SymbolIcon';
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { LoadingSkeleton as Skeleton, Field as Inp, TextareaField as TextArea, AppDialog, AppButton, DetailDrawer, AppInput } from '../../components/ui/controls';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    getAllRegions, createRegion, updateRegion, deleteRegion,
    getRegionsByCountry,
} from '../../services/region.service';
import { getDamsByRegion } from '../../services/dam.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────




// ─── Region Form Modal ────────────────────────────────────────────────────────
function RegionFormModal({ region, onClose, onSaved }) {
    const editing = !!region;
    const EMPTY = { name: '', nameSi: '', nameTa: '', stateProvince: '', country: 'Sri Lanka', latitude: '', longitude: '', boundaryGeojson: '' };
    const [form, setForm] = useState(editing ? {
        name: region.name || '', nameSi: region.nameSi || '', nameTa: region.nameTa || '',
        stateProvince: region.stateProvince || '', country: region.country || '',
        latitude: region.latitude ?? '', longitude: region.longitude ?? '',
        boundaryGeojson: region.boundaryGeojson || '',
    } : EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Required';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { ...form };
            if (payload.latitude !== '') payload.latitude = Number(payload.latitude);
            else delete payload.latitude;
            if (payload.longitude !== '') payload.longitude = Number(payload.longitude);
            else delete payload.longitude;
            if (!payload.nameSi) delete payload.nameSi;
            if (!payload.nameTa) delete payload.nameTa;
            if (!payload.stateProvince) delete payload.stateProvince;
            if (!payload.country) delete payload.country;
            if (!payload.boundaryGeojson) delete payload.boundaryGeojson;

            const saved = editing ? await updateRegion(region.id, payload) : await createRegion(payload);
            toast.success(`Region "${saved.name}" ${editing ? 'updated' : 'created'}`);
            onSaved(saved, editing);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || `Failed to ${editing ? 'update' : 'create'} region`); }
        finally { setSaving(false); }
    };

    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <Typography component="h2" variant="h2" className="text-base font-semibold text-gray-900">{editing ? 'Edit Region' : 'Add Region'}</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <Inp label="Name *" placeholder="Western Province" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="Name (Sinhala)" hint="optional" placeholder="බස්නාහිර පළාත" value={form.nameSi} onChange={e => set('nameSi', e.target.value)} />
                        <Inp label="Name (Tamil)" hint="optional" placeholder="மேல் மாகாணம்" value={form.nameTa} onChange={e => set('nameTa', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="State / Province" placeholder="Western" value={form.stateProvince} onChange={e => set('stateProvince', e.target.value)} />
                        <Inp label="Country" placeholder="Sri Lanka" value={form.country} onChange={e => set('country', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Inp label="Latitude" type="number" step="any" placeholder="6.9271" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
                        <Inp label="Longitude" type="number" step="any" placeholder="79.8612" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
                    </div>
                    <TextArea label="Boundary GeoJSON (optional)" placeholder='{"type":"Polygon","coordinates":[…]}' value={form.boundaryGeojson} onChange={e => set('boundaryGeojson', e.target.value)} />
                    <div className="flex justify-end gap-3 pt-1">
                        <AppButton type="button" onClick={onClose} className="">Cancel</AppButton>
                        <AppButton variant="contained" type="submit" disabled={saving} className="disabled:opacity-60">{saving ? (editing ? 'Saving…' : 'Creating…') : (editing ? 'Save Changes' : 'Create Region')}</AppButton>
                    </div>
                </form>
            </div>
        </AppDialog>
    );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ region, onClose, onDeleted }) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        setLoading(true);
        try {
            await deleteRegion(region.id);
            toast.success(`"${region.name}" deleted`);
            onDeleted(region.id);
            onClose();
        } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); }
        finally { setLoading(false); }
    };
    return (
        <AppDialog onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg"><SymbolIcon name="warning" /></span>
                    <div><Typography component="h2" variant="h2" className="text-sm font-semibold text-gray-900">Delete Region</Typography><p className="text-xs text-gray-500">This cannot be undone</p></div>
                </div>
                <p className="text-sm text-gray-700 mb-5">Delete <strong>{region.name}</strong>? Any dams linked to this region will be unlinked.</p>
                <div className="flex justify-end gap-3">
                    <AppButton onClick={onClose} className="">Cancel</AppButton>
                    <AppButton variant="contained" color="error" onClick={confirm} disabled={loading} className="disabled:opacity-60">{loading ? 'Deleting…' : 'Delete'}</AppButton>
                </div>
            </div>
        </AppDialog>
    );
}

// ─── Region Detail Drawer ─────────────────────────────────────────────────────
function RegionDrawer({ region, onClose, onEdit, onDelete }) {
    const [dams, setDams] = useState([]);
    const [loadingDams, setLoadingDams] = useState(true);

    useEffect(() => {
        setLoadingDams(true);
        getDamsByRegion(region.id)
            .then(list => setDams(list || []))
            .catch(() => { })
            .finally(() => setLoadingDams(false));
    }, [region.id]);

    const hasCoords = region.latitude != null && region.longitude != null;

    return (
        <DetailDrawer onClose={onClose}>

            <div className="flex h-full flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <Typography component="h2" variant="h2" className="text-sm font-bold text-gray-900">{region.name}</Typography>
                        {(region.nameSi || region.nameTa) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {region.nameSi}{region.nameSi && region.nameTa ? ' · ' : ''}{region.nameTa}
                            </p>
                        )}
                    </div>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center"><SymbolIcon name="close" /></AppButton>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-blue-700">{loadingDams ? '…' : dams.length}</p>
                            <p className="text-xs text-blue-600 mt-0.5">Dams</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-sm font-semibold text-gray-700">{region.country || '—'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Country</p>
                        </div>
                    </div>

                    {/* Location info */}
                    <div>
                        <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Location</Typography>
                        {[
                            { label: 'State / Province', value: region.stateProvince },
                            { label: 'Country', value: region.country },
                            { label: 'Coordinates', value: hasCoords ? `${Number(region.latitude).toFixed(4)}°N, ${Number(region.longitude).toFixed(4)}°E` : null },
                            { label: 'Region ID', value: `#${region.id}` },
                            { label: 'Created', value: region.createdAt ? new Date(region.createdAt).toLocaleDateString() : null },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                                <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
                                <span className="text-xs font-medium text-gray-800 text-right">{value || '—'}</span>
                            </div>
                        ))}
                    </div>

                    {/* Map link if coords available */}
                    {hasCoords && (
                        <a href={`https://maps.google.com/?q=${region.latitude},${region.longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                            <SymbolIcon name="map" /> View on Google Maps
                        </a>
                    )}

                    {/* GeoJSON indicator */}
                    {region.boundaryGeojson && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                            <span className="text-emerald-600"><SymbolIcon name="check" /></span>
                            <span className="text-xs text-emerald-700 font-medium">Boundary GeoJSON available</span>
                        </div>
                    )}

                    {/* Dams list */}
                    <div>
                        <Typography component="h3" variant="h3" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Dams in This Region {!loadingDams && `(${dams.length})`}
                        </Typography>
                        {loadingDams ? (
                            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                        ) : dams.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">No dams in this region</p>
                        ) : (
                            <div className="space-y-2">
                                {dams.map(d => (
                                    <div key={d.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="text-base"><SymbolIcon name="dam" /></span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-gray-800 truncate">{d.name}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">{d.code}</p>
                                        </div>
                                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize
                                            ${(d.status || '').toLowerCase() === 'operational'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                            {(d.status || 'unknown').replace('_', ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-2">
                    <AppButton variant="outlined" onClick={() => { onClose(); onEdit(region); }}
                        className="">
                        Edit Region
                    </AppButton>
                    <AppButton variant="outlined" onClick={() => { onClose(); onDelete(region); }}
                        className="">
                        Delete Region
                    </AppButton>
                </div>
            </div>
        </DetailDrawer>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export default function RegionsPage() {
    const [regions, setRegions] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);

    const [countryFilter, setCountryFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [editingRegion, setEditingRegion] = useState(null);
    const [deletingRegion, setDeletingRegion] = useState(null);
    const [selectedRegion, setSelectedRegion] = useState(null);

    const load = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            const data = await getAllRegions(p, PAGE_SIZE);
            setRegions(data?.content ?? []);
            setTotal(data?.totalElements ?? 0);
            setTotalPages(data?.totalPages ?? 1);
            setPage(data?.number ?? p);
        } catch { toast.error('Failed to load regions'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(0); }, []);

    // Derive all unique countries from loaded data
    const countries = [...new Set(regions.map(r => r.country).filter(Boolean))].sort();

    // Client-side filtering (paginated list is small)
    const visible = regions.filter(r => {
        const matchSearch = !search ||
            r.name?.toLowerCase().includes(search.toLowerCase()) ||
            r.nameSi?.toLowerCase().includes(search.toLowerCase()) ||
            r.nameTa?.toLowerCase().includes(search.toLowerCase()) ||
            r.stateProvince?.toLowerCase().includes(search.toLowerCase());
        const matchCountry = !countryFilter || r.country === countryFilter;
        return matchSearch && matchCountry;
    });

    const handleSaved = (saved, editing) => {
        if (editing) {
            setRegions(prev => prev.map(r => r.id === saved.id ? saved : r));
            if (selectedRegion?.id === saved.id) setSelectedRegion(saved);
        } else {
            setRegions(prev => [saved, ...prev]);
            setTotal(t => t + 1);
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <Typography component="h1" variant="h1" className="text-xl font-bold text-gray-900">Regions</Typography>
                    <p className="text-sm text-gray-400">{loading ? '…' : `${total} regions`}</p>
                </div>
                <AppButton variant="contained" onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2">
                    <span className="text-base leading-none">+</span> Add Region
                </AppButton>
            </div>

            {/* Stat strip */}
            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Regions', value: total, color: 'bg-blue-500' },
                        { label: 'Countries', value: countries.length, color: 'bg-emerald-500' },
                        { label: 'With Coords', value: regions.filter(r => r.latitude != null).length, color: 'bg-violet-500' },
                        { label: 'With GeoJSON', value: regions.filter(r => r.boundaryGeojson).length, color: 'bg-amber-500' },
                    ].map(({ label, value, color }) => (
                        <Paper variant="outlined" key={label} className="bg-white border border-gray-200  p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-xs text-gray-500">{label}</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                        </Paper>
                    ))}
                </div>
            )}

            {/* Search + Country filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"><SymbolIcon name="search" /></span>
                    <AppInput aria-label="Search by name, Sinhala, Tamil, or province…" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, Sinhala, Tamil, or province…"
                        className="w-full" />
                </div>
                {countries.length > 1 && (
                    <div className="flex flex-wrap gap-2 items-center">
                        <AppButton onClick={() => setCountryFilter('')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${!countryFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            All Countries
                        </AppButton>
                        {countries.map(c => (
                            <AppButton key={c} onClick={() => setCountryFilter(cc => cc === c ? '' : c)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${countryFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                {c}
                            </AppButton>
                        ))}
                    </div>
                )}
            </div>

            {/* Table */}
            <Paper variant="outlined" className="bg-white border border-gray-200   overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                        <TableHead>
                            <TableRow className="bg-gray-50 border-b border-gray-100 text-left">
                                {['Region Name', 'Translations', 'State / Province', 'Country', 'Coordinates', 'GeoJSON', 'Created', 'Actions'].map(h => (
                                    <TableCell component="th" key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                                        <TableCell key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}</TableRow>
                                ))
                            ) : visible.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="py-16 text-center">
                                    <p className="text-3xl mb-2"><SymbolIcon name="map" /></p>
                                    <p className="text-sm text-gray-400">No regions found</p>
                                    {(search || countryFilter) && (
                                        <AppButton onClick={() => { setSearch(''); setCountryFilter(''); }} className="mt-1 underline">Clear filters</AppButton>
                                    )}
                                </TableCell></TableRow>
                            ) : visible.map(r => (
                                <TableRow key={r.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedRegion(r)}>
                                    <TableCell className="px-4 py-3">
                                        <p className="font-semibold text-gray-900">{r.name}</p>
                                        <p className="text-[11px] text-gray-400 font-mono">#{r.id}</p>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs">
                                        {r.nameSi && <p className="text-gray-700">{r.nameSi}</p>}
                                        {r.nameTa && <p className="text-gray-500">{r.nameTa}</p>}
                                        {!r.nameSi && !r.nameTa && <span className="text-gray-300">—</span>}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-gray-600">{r.stateProvince || '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-gray-600">{r.country || '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-gray-500">
                                        {r.latitude != null
                                            ? <span className="font-mono">{Number(r.latitude).toFixed(3)}, {Number(r.longitude).toFixed(3)}</span>
                                            : <span className="text-gray-300">—</span>}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-center">
                                        {r.boundaryGeojson
                                            ? <span className="text-emerald-500 text-base" title="GeoJSON available"><SymbolIcon name="check" /></span>
                                            : <span className="text-gray-200">—</span>}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                    </TableCell>
                                    <TableCell className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <AppButton onClick={() => setSelectedRegion(r)} className="hover:underline">View</AppButton>
                                            <AppButton onClick={() => setEditingRegion(r)} className="hover:underline">Edit</AppButton>
                                            <AppButton onClick={() => setDeletingRegion(r)} className="hover:underline">Delete</AppButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {!search && !countryFilter && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Page {page + 1} of {totalPages} · {total} total</p>
                        <div className="flex gap-1">
                            <AppButton variant="outlined" disabled={page === 0} onClick={() => load(page - 1)} className="disabled:opacity-40">← Prev</AppButton>
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                const pg = Math.max(0, page - 2) + i;
                                if (pg >= totalPages) return null;
                                return <AppButton key={pg} onClick={() => load(pg)}
                                    className={`w-8 h-8 text-xs font-medium rounded-lg border transition ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>{pg + 1}</AppButton>;
                            })}
                            <AppButton variant="outlined" disabled={page + 1 >= totalPages} onClick={() => load(page + 1)} className="disabled:opacity-40">Next →</AppButton>
                        </div>
                    </div>
                )}
            </Paper>

            {/* Drawers + Modals */}
            {selectedRegion && (
                <RegionDrawer
                    region={selectedRegion}
                    onClose={() => setSelectedRegion(null)}
                    onEdit={r => { setSelectedRegion(null); setEditingRegion(r); }}
                    onDelete={r => { setSelectedRegion(null); setDeletingRegion(r); }}
                />
            )}
            {showCreate && (
                <RegionFormModal onClose={() => setShowCreate(false)} onSaved={(saved) => handleSaved(saved, false)} />
            )}
            {editingRegion && (
                <RegionFormModal region={editingRegion} onClose={() => setEditingRegion(null)} onSaved={(saved) => handleSaved(saved, true)} />
            )}
            {deletingRegion && (
                <DeleteModal region={deletingRegion}
                    onClose={() => setDeletingRegion(null)}
                    onDeleted={id => { setRegions(prev => prev.filter(r => r.id !== id)); setTotal(t => t - 1); }} />
            )}
        </div>
    );
}
