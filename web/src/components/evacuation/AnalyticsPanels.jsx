import { useEffect, useState } from 'react';
import { Battery, Car, Clock, Footprints, MapPin, Navigation, Pause, Play, Search, TriangleAlert, X } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { STATE_LABEL } from './peopleFilter';

// Fixed colours (the old theme remaps Tailwind's blue/green to its own roles)
const STATE_BADGE = {
    danger: 'bg-destructive text-white', moving: 'bg-[#1D4ED8] text-white',
    sos: 'bg-[#C2410C] text-white', safe: 'bg-[#15803D] text-white',
};

// ── People: filters, list, stragglers ─────────────────────────────────────────

export function PeoplePanel({ people, shown, filter, onFilter, zones, stragglers, selectedId, onSelect }) {
    const counts = people.reduce((acc, p) => ({ ...acc, [p.state]: (acc[p.state] || 0) + 1 }), {});
    const set = (patch) => onFilter({ ...filter, ...patch });

    return (
        <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by state">
                {['all', 'danger', 'moving', 'sos', 'safe'].map((s) => (
                    <Button key={s} size="sm" variant={filter.state === s ? 'default' : 'outline'} className="h-7 px-2 text-xs"
                        aria-pressed={filter.state === s} onClick={() => set({ state: s })}>
                        {s === 'all' ? `All ${people.length}` : `${STATE_LABEL[s]} ${counts[s] || 0}`}
                    </Button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Select value={filter.mode} onValueChange={(v) => set({ mode: v })}>
                    <SelectTrigger size="sm" className="w-full" aria-label="Travel mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Walking & driving</SelectItem>
                        <SelectItem value="walk">Walking</SelectItem>
                        <SelectItem value="drive">Driving</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filter.zoneId} onValueChange={(v) => set({ zoneId: v })}>
                    <SelectTrigger size="sm" className="w-full" aria-label="Zone"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Any zone</SelectItem>
                        {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input value={filter.q} onChange={(e) => set({ q: e.target.value })} placeholder="Find a person…" className="h-8 pl-7" aria-label="Find a person" />
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs">
                    <Switch size="sm" checked={filter.stragglersOnly} onCheckedChange={(v) => set({ stragglersOnly: v })} />
                    Need attention ({stragglers.length})
                </label>
            </div>
            <p className="text-xs text-muted-foreground">Showing {shown.length} of {people.length} on the map. Click a person for details and their route.</p>

            <ul className="divide-y rounded-lg border">
                {shown.slice(0, 200).map((p) => {
                    const s = stragglers.find((x) => x.id === p.id);
                    return (
                        <li key={p.id}>
                            <button type="button" onClick={() => onSelect(p.id)}
                                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted ${p.id === selectedId ? 'bg-accent' : ''}`}>
                                {p.mode === 'drive' ? <Car className="size-4 shrink-0 text-muted-foreground" /> : <Footprints className="size-4 shrink-0 text-muted-foreground" />}
                                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                                {s && <TriangleAlert className="size-3.5 shrink-0 text-amber-600" aria-label={s.reasons.join(', ')} />}
                                <Badge className={`shrink-0 ${STATE_BADGE[p.state]}`}>{STATE_LABEL[p.state]}</Badge>
                            </button>
                        </li>
                    );
                })}
                {shown.length === 0 && <li className="px-3 py-6 text-center text-muted-foreground">Nobody matches these filters.</li>}
            </ul>
        </div>
    );
}

/** Selected person: details and their live route to the shelter. */
export function PersonCard({ person, straggler, route, onRoute, onClose }) {
    if (!person) return null;
    return (
        <div className="space-y-2 rounded-lg border bg-card p-3 text-sm shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-semibold">{person.name}</p>
                    <Badge className={STATE_BADGE[person.state]}>{STATE_LABEL[person.state]}</Badge>
                </div>
                <Button size="icon" variant="ghost" className="size-7" onClick={onClose} aria-label="Close"><X /></Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Travelling</dt><dd className="flex items-center gap-1">{person.mode === 'drive' ? <Car className="size-3.5" /> : <Footprints className="size-3.5" />}{person.mode === 'drive' ? 'Driving' : 'Walking'} · {(person.speedMps * 3.6).toFixed(0)} km/h</dd>
                <dt className="text-muted-foreground">Zone</dt><dd>{person.zoneName || 'Outside the zones'}</dd>
                <dt className="text-muted-foreground">Heading to</dt><dd className="flex items-center gap-1"><MapPin className="size-3.5" />{person.shelterName || '—'}{person.shelterKm != null ? ` (${person.shelterKm} km)` : ''}</dd>
                <dt className="text-muted-foreground">Arrives in</dt><dd className="flex items-center gap-1"><Clock className="size-3.5" />{person.etaMin != null ? `~${person.etaMin} min` : person.state === 'safe' ? 'arrived' : '—'}</dd>
                <dt className="text-muted-foreground">Battery</dt><dd className="flex items-center gap-1"><Battery className="size-3.5" />{person.battery != null ? `${person.battery}%` : '—'}</dd>
                <dt className="text-muted-foreground">Last update</dt><dd>{person.secondsSinceUpdate}s ago</dd>
            </dl>
            {straggler && <p className="flex items-center gap-1 text-xs text-amber-700"><TriangleAlert className="size-3.5" /> Needs attention: {straggler.reasons.join(', ')}</p>}
            {person.state !== 'safe' && (
                <Button size="sm" variant={route ? 'secondary' : 'default'} className="w-full" onClick={onRoute}>
                    <Navigation /> {route ? `Live route: ${route.distanceKm} km · ~${route.etaMin} min (updates)` : 'Show live route'}
                </Button>
            )}
            <p className="text-[11px] text-muted-foreground">Simulated person (demo).</p>
        </div>
    );
}

// ── Zones: clearance, flood countdown, progress ───────────────────────────────

export function ZonesPanel({ zones, progress }) {
    return (
        <div className="space-y-3 text-sm">
            {zones.length === 0 && <p className="py-6 text-center text-muted-foreground">No zone is being evacuated.</p>}
            {zones.map((z) => (
                <div key={z.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate font-medium">{z.name}</p>
                            <p className="text-xs text-muted-foreground">{z.damName} · level {z.level}</p>
                        </div>
                        <FloodBadge zone={z} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-xs">
                        <span><b className="text-base tabular-nums">{z.clearedPct}%</b> evacuated</span>
                        <span className={z.peopleInside ? 'font-medium text-destructive' : 'text-muted-foreground'}>{z.peopleInside} still inside</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={z.clearedPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${z.name} evacuated`}>
                        <div className="h-full bg-[#15803D] transition-all" style={{ width: `${z.clearedPct}%` }} />
                    </div>
                </div>
            ))}
            {progress?.series?.length > 1 && (
                <div className="rounded-lg border p-3">
                    <p className="mb-1 font-medium">Evacuation progress</p>
                    <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progress.series} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={24} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <ChartTooltip />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Line type="monotone" dataKey="safe" name="Reached safety" stroke="#15803D" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="onTheMove" name="Sharing location" stroke="#1D4ED8" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

function FloodBadge({ zone }) {
    if (zone.flooded) return <Badge className="shrink-0 bg-red-900 text-white">Flooded</Badge>;
    if (zone.floodInMin == null) return null;
    return <Badge className={`shrink-0 ${zone.floodInMin <= 10 ? 'bg-destructive text-white' : 'bg-amber-500 text-white'}`}>Water in {zone.floodInMin} min</Badge>;
}

// ── Shelters with forecast ────────────────────────────────────────────────────

export function ShelterForecast({ shelters }) {
    if (shelters.length === 0) return <p className="py-6 text-center text-muted-foreground">No shelters.</p>;
    return (
        <ul className="space-y-2.5 text-sm">
            {shelters.map((s) => {
                const pct = s.capacity ? Math.min(100, Math.round((s.occupancy / s.capacity) * 100)) : 0;
                const tone = s.inZone ? 'bg-muted-foreground' : pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-[#15803D]';
                return (
                    <li key={s.id} className="rounded-lg border p-2.5">
                        <div className="flex justify-between gap-2">
                            <span className="truncate font-medium">{s.name}</span>
                            <span className="shrink-0 tabular-nums">{s.occupancy}{s.capacity ? ` / ${s.capacity}` : ''}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name} occupancy`}>
                            <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {s.inZone ? 'Inside a danger zone — not used'
                                : s.incoming ? `+${s.incoming} on the way${s.willFill ? ` · full ${s.fullInMin != null ? `in ~${s.fullInMin} min` : 'soon'}` : ''}` : 'Nobody on the way'}
                        </p>
                        {s.willFill && !s.inZone && <p className="text-xs font-medium text-amber-700">Will fill: later arrivals are sent to the next shelter</p>}
                    </li>
                );
            })}
        </ul>
    );
}

// ── Replay bar ────────────────────────────────────────────────────────────────

/** Live / replay switch with a time slider. onFrame(frame | null) — null means live. */
export function ReplayBar({ frames, onLoad, onFrame }) {
    const [mode, setMode] = useState('live');
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(4);

    useEffect(() => {
        if (!playing || frames.length === 0) return undefined;
        const timer = setInterval(() => setIndex((i) => {
            if (i >= frames.length - 1) { setPlaying(false); return i; }
            return i + 1;
        }), 1000 / speed);
        return () => clearInterval(timer);
    }, [playing, speed, frames.length]);

    useEffect(() => { onFrame(mode === 'replay' ? frames[index] || null : null); }, [mode, index, frames, onFrame]);

    const startReplay = async () => {
        setMode('replay');
        setIndex(0);
        await onLoad();
        setPlaying(true);
    };
    const frame = frames[index];
    const clock = frame ? new Date(frame.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

    return (
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-1.5 text-xs">
            <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Live or replay">
                <Button size="sm" variant={mode === 'live' ? 'secondary' : 'ghost'} className="h-6 px-2" onClick={() => { setMode('live'); setPlaying(false); }}>Live</Button>
                <Button size="sm" variant={mode === 'replay' ? 'secondary' : 'ghost'} className="h-6 px-2" onClick={startReplay}>Replay</Button>
            </div>
            {mode === 'replay' && (
                <>
                    <Button size="icon" variant="ghost" className="size-6" onClick={() => setPlaying((v) => !v)} aria-label={playing ? 'Pause' : 'Play'}>
                        {playing ? <Pause /> : <Play />}
                    </Button>
                    <input type="range" min={0} max={Math.max(0, frames.length - 1)} value={index} onChange={(e) => { setIndex(Number(e.target.value)); setPlaying(false); }}
                        className="min-w-40 flex-1 accent-[var(--primary)]" aria-label="Replay time" />
                    <span className="w-20 tabular-nums">{clock}</span>
                    <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
                        <SelectTrigger size="sm" className="h-6 w-16" aria-label="Replay speed"><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 4, 16].map((s) => <SelectItem key={s} value={String(s)}>{s}×</SelectItem>)}</SelectContent>
                    </Select>
                    {frames.length === 0 && <span className="text-muted-foreground">No recorded movement in the last hour.</span>}
                </>
            )}
            {mode === 'live' && <span className="text-muted-foreground">Replay shows the last hour of movement (every 15 s).</span>}
        </div>
    );
}
